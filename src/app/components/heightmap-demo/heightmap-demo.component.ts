import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
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
  BoxGeometry,
  PlaneGeometry,
} from 'three';

@Component({
  selector: 'app-heightmap-demo',
  templateUrl: './heightmap-demo.component.html',
  styleUrls: ['./heightmap-demo.component.scss'],
})
export class HeightmapDemoComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('heightmap') canvasRef!: ElementRef<HTMLCanvasElement>;
  scene!: Scene;
  camera!: PerspectiveCamera;
  renderer!: WebGLRenderer;
  map!: Mesh;
  animationFrameId!: number;

  isDragging = false;
  previousMousePosition = new Vector2();

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    this.initializeScene();
    this.initializeRenderer();
    this.initializeCamera();
    this.addLighting();
    this.addEventListeners();
    this.loadTextures();
    this.animate();
  }

  private initializeScene() {
    this.scene = new Scene();
  }

  private initializeRenderer() {
    this.renderer = new WebGLRenderer({ canvas: this.canvasRef.nativeElement });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
  }

  private initializeCamera() {
    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 25, 25);
    this.camera.lookAt(0, 0, 0);
  }

  private addLighting() {
    const directionalLight = new PointLight(0xffffff, 0.5);
    directionalLight.distance = 25;
    directionalLight.power = 1000;
    directionalLight.position.set(0, 8, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const ambientLight = new AmbientLight(0x403040, 1);
    this.scene.add(ambientLight);
  }

  private addEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.addMouseListeners();
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

  private loadTextures() {
    const loader = new TextureLoader();

    loader.load('assets/heightmap.png', (texture: Texture) =>
      this.onTextureLoaded(texture)
    );

    loader.load('assets/normalmap.png', (normalMap: Texture) =>
      this.createFloor(normalMap)
    );
  }

  private onTextureLoaded(texture: Texture) {
    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;

    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(texture.image, 0, 0);

    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    this.generateTerrain(data);
  }

  private createFloor(normalMap: Texture) {
    const geometry = new PlaneGeometry(500, 500, 50, 50);
    const material = new MeshStandardMaterial({
      color: 0x888888,
      normalMap: normalMap,
      roughness: 0.7,
      metalness: 0.1,
    });

    const floor = new Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private generateTerrain(imageData: ImageData) {
    const vertices = [];
    const indices: number[] = [];

    for (let z = 0; z < imageData.height - 1; z++) {
      const offset = z * imageData.width;
      for (let x = 0; x < imageData.width - 1; x++) {
        indices.push(
          offset + x,
          offset + x + imageData.width,
          offset + x + 1,
          offset + x + 1,
          offset + x + imageData.width,
          offset + x + imageData.width + 1
        );
      }
    }

    const geometry = new BufferGeometry();
    geometry.setIndex(indices);
    this.map = new Mesh(
      geometry,
      new MeshStandardMaterial({
        color: 0x808080,
      })
    );
    this.scene.add(this.map);
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
  }
}
