import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
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
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

@Component({
  selector: 'app-heightmap-demo',
  templateUrl: './heightmap-demo.component.html',
  styleUrls: ['./heightmap-demo.component.scss'],
})
export class HeightmapDemoComponent
  implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heightmap') canvasRef!: ElementRef<HTMLCanvasElement>;
  scene!: Scene;
  camera!: PerspectiveCamera;
  renderer!: WebGLRenderer;
  map!: Mesh;
  animationFrameId!: number;

  isDragging = false;
  previousMousePosition = new Vector2();

  constructor() {
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 25, 25);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new WebGLRenderer({canvas: this.canvasRef.nativeElement});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    const loader = new TextureLoader();
    loader.load('assets/heightmap.png', (texture: Texture) =>
      this.onTextureLoaded(texture)
    );

    // Lade auch die Normalmap und erstelle die Wand
    loader.load('assets/normalmap.png', (normalMap: Texture) =>
      this.createWall(normalMap)
    );

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.addMouseListeners();

    this.animate();

    // Baum hinzufügen
    this.loadTree(); // Hier den Baum laden
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
    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;

    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(texture.image, 0, 0);

    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    this.generateTerrain(data);
    this.addCube(-5, 4, -5, 0xff0000); // Rot
    this.addSphere(0, 3, -5, 0x0000ff); // Blau
    this.generateLight();

    // Füge eine Geometrie mit Phong Material hinzu
    this.addPhongSphere(5, 3, 0, 0x00ff00); // Grünes Phong-Sphere
  }

  private loadTree() {
    const loader = new GLTFLoader();
    loader.load('assets/baum.glb', (gltf) => {
      const tree = gltf.scene;

      // Baum skalieren (optional)
      tree.scale.set(1, 1, 1); // Skalierung des Baums

      // Baum positionieren
      tree.position.set(0, -5, -10); // Position des Baums

      // Baum umdrehen: Drehung um 180 Grad entlang der X-Achse
      tree.rotation.x = Math.PI; // Drehung um 180 Grad (PI) auf der X-Achse, um den Baum umzudrehen
      this.animateTree(tree);
      tree.castShadow = true;
      tree.receiveShadow = true;

      this.scene.add(tree);
    }, undefined, (error) => {
      console.error('Error loading the tree model:', error);
    });
  }

  private animateTree(tree: THREE.Group) {
    let angle = 0;

    // Animationsfunktion, die im Renderloop immer wieder aufgerufen wird
    const animate = () => {
      angle += 0.01; // Geschwindigkeit der Animation anpassen

      tree.rotation.y = Math.sin(angle) * 0.5; // Der Baum bewegt sich hin und her

      tree.position.y = 1 + Math.sin(angle * 2) * 0.8; // Heben und Senken des Baums

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate(); // Starte die Animation
  }

  private createWall(normalMap: Texture) {
    // PlaneGeometry für die Wand
    const geometry = new PlaneGeometry(25, 25, 25, 25);
    const material = new MeshStandardMaterial({
      color: 0x888888,
      normalMap: normalMap,
      roughness: 0.7,
      metalness: 0.1,
    });

    const wall = new Mesh(geometry, material);
    wall.rotation.y = Math.PI; // Drehung um 180° um die Y-Achse
    wall.position.set(-2, 15, 15); // Wandposition auf der anderen Seite (negative X-Achse)
    wall.receiveShadow = true;

    this.scene.add(wall);
  }


  private addCube(x: number, y: number, z: number, color: number) {
    const material = new MeshStandardMaterial({color: color});
    const box = new BoxGeometry(3, 3, 3);
    const mesh = new Mesh(box, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, y, z);

    // Würfelbewegung initialisieren
    mesh.name = 'MovingCube'; // Name setzen, um ihn später zu finden
    mesh.userData['direction'] = 1; // 1 für rechts, -1 für links

    this.scene.add(mesh);
  }

  private addSphere(x: number, y: number, z: number, color: number) {
    const material = new MeshStandardMaterial({color: color});
    const sphere = new SphereGeometry(2, 32, 32);
    const mesh = new Mesh(sphere, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
  }

  private addPhongSphere(x: number, y: number, z: number, color: number) {
    // Geometrie und Phong-Material hinzufügen
    const geometry = new SphereGeometry(3, 32, 32);
    const material = new MeshStandardMaterial({
      color: color,
    });

    const sphere = new Mesh(geometry, material);
    sphere.position.set(x, y, z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    this.scene.add(sphere);
  }

  private generateTerrain(imageData: ImageData) {
    const vertices = [];
    const colorInfos = [
      [0.53, 0.71, 0.42],
      [0.64, 0.77, 0.53],
      [0.74, 0.82, 0.63],
      [0.85, 0.87, 0.74],
      [0.94, 0.91, 0.8],
      [0.97, 0.85, 0.64],
      [0.91, 0.76, 0.51],
      [0.79, 0.63, 0.43],
      [0.68, 0.53, 0.34],
      [0.5, 0.38, 0.23],
    ];
    const colors = [];

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
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(vertices), 3)
    );
    geometry.setAttribute(
      'color',
      new BufferAttribute(new Float32Array(colors), 4)
    );

    const material = new MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
    });

    this.map = new Mesh(geometry, material);
    this.map.castShadow = true;
    this.map.receiveShadow = true;
    this.scene.add(this.map);
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
    directionalLight.shadow
      .mapSize.height = 2048;
    this.scene.add(directionalLight);
    const directionalLight2 = new DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 50, 50);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight2);

  }


  private addAmbientLight() {
    const ambientLight = new AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    // Würfelanimation
    const movingCube = this.scene.getObjectByName('MovingCube');
    if (movingCube) {
      const direction = movingCube.userData['direction'];
      movingCube.position.x += direction * 0.1;

      if (movingCube.position.x > 10 || movingCube.position.x < -10) {
        movingCube.userData['direction'] *= -1; // Richtung umkehren
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

