import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import * as THREE from 'three'; // Füge den Import von THREE hinzu
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  MeshStandardMaterial,
  Mesh,
  TextureLoader,
  Texture,
  BufferGeometry,
  BufferAttribute,
  Vector2,
  DirectionalLight,
  AmbientLight,
  SphereGeometry,
  PointLight,
} from 'three';

@Component({
  selector: 'app-normalmap-demo',
  templateUrl: './normalmap-demo.component.html',
  styleUrls: ['./normalmap-demo.component.scss'],
})
export class NormalmapDemoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heightmap') canvasRef!: ElementRef<HTMLCanvasElement>;
  scene!: Scene;
  camera!: PerspectiveCamera;
  renderer!: WebGLRenderer;
  map!: Mesh;
  animationFrameId!: number;

  isDragging = false;
  previousMousePosition = new Vector2();

  constructor() {}

  ngAfterViewInit(): void {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 25, 25);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new WebGLRenderer({ canvas: this.canvasRef.nativeElement });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    const loader = new TextureLoader();
    loader.load('assets/heightmap.png', (texture: Texture) => this.onTextureLoaded(texture));

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.addMouseListeners();

    this.animate();
  }

  private addMouseListeners() {
    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('mousedown', (event) => {
      this.isDragging = true;
      this.previousMousePosition.set(event.clientX, event.clientY);
    });

    canvas.addEventListener('mousemove', (event) => {
      if (!this.isDragging) return;

      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.previousMousePosition.set(event.clientX, event.clientY);

      const rotationSpeed = 0.005;
      this.scene.rotation.y += deltaX * rotationSpeed;
      this.scene.rotation.x += deltaY * rotationSpeed;
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onTextureLoaded(texture: Texture) {
    const loader = new TextureLoader();
    loader.load('assets/normalmap.png', (normalMap: Texture) => {
      normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
      normalMap.minFilter = normalMap.magFilter = THREE.LinearFilter;

      const canvas = document.createElement('canvas');
      canvas.width = texture.image.width;
      canvas.height = texture.image.height;

      const context = canvas.getContext('2d') as CanvasRenderingContext2D;
      context.drawImage(texture.image, 0, 0);

      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      this.generateTerrain(data, normalMap);
      this.addCube(-5, 4, -5);
      this.addCube(0, 3, -5);
      this.generateLight();
    });
  }

  private generateTerrain(imageData: ImageData, normalMap: Texture) {
    const vertices = [];
    const colors = [];

    const colorInfos = [
      [0.53, 0.71, 0.42],
      [0.64, 0.77, 0.53],
      [0.74, 0.82, 0.63],
      [0.85, 0.87, 0.74],
      [0.94, 0.91, 0.80],
      [0.97, 0.85, 0.64],
      [0.91, 0.76, 0.51],
      [0.79, 0.63, 0.43],
      [0.68, 0.53, 0.34],
      [0.50, 0.38, 0.23],
    ];

    for (let z = 0; z < imageData.height; z++) {
      for (let x = 0; x < imageData.width; x++) {
        const index = x * 4 + z * imageData.width * 4;
        const y = imageData.data[index] / 255;

        vertices.push(x - imageData.width / 2, y * 5, z - imageData.height / 2);

        const colorIndex = Math.min(Math.max(Math.floor(y * 10), 0), 9);
        colors.push(...colorInfos[colorIndex], 1);
      }
    }

    const indices: number[] = [];
    for (let j = 0; j < imageData.height - 1; j++) {
      let offset = j * imageData.width;
      for (let i = offset; i < offset + imageData.height - 1; i++) {
        indices.push(i, i + imageData.width, i + 1);
        indices.push(i + 1, i + imageData.width, i + 1 + imageData.width);
      }
    }

    const geometry = new BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 4));

    const material = new MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      normalMap: normalMap,
    });

    this.map = new Mesh(geometry, material);
    this.map.castShadow = true;
    this.map.receiveShadow = true;
    this.scene.add(this.map);
  }

  private addCube(x: number, y: number, z: number) {
    const material = new MeshStandardMaterial();
    const sphere = new SphereGeometry(2, 16, 6);
    const mesh = new Mesh(sphere, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
  }

  private generateLight() {
    this.createDirectionalLight();
    this.addAmbientLight();
  }

  private createDirectionalLight() {
    const directionalLight = new PointLight(0xffffff, 0.5);
    directionalLight.distance = 25;
    directionalLight.power = 1000;
    directionalLight.position.set(0, 8, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 200;
    this.scene.add(directionalLight);
  }

  private addAmbientLight() {
    const ambientLight = new AmbientLight(0x403040, 1);
    this.scene.add(ambientLight);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.map) {
      this.map.rotation.y += 0.01;
    }

    const lightRadius = 20;
    const lightHeight = 15;
    const lightSpeed = 0.0005;

    if (this.scene.children.find((child) => child instanceof PointLight)) {
      const directionalLight = this.scene.children.find(
        (child) => child instanceof PointLight
      ) as PointLight;

      if (directionalLight) {
        const time = Date.now() * lightSpeed;
        directionalLight.position.set(
          lightRadius * Math.cos(time),
          lightHeight,
          lightRadius * Math.sin(time)
        );

        directionalLight.lookAt(0, 0, 0);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
