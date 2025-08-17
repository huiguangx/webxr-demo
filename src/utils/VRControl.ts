import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";

interface IController extends THREE.Group {
  ray?: THREE.Mesh;
  point?: THREE.Sprite;
}

export default class VRControls {
  public readonly controllers: IController[] = [];
  public readonly controllerGrips: THREE.Group[] = [];

  private readonly controllerModelFactory: XRControllerModelFactory;
  private readonly dummyMatrix: THREE.Matrix4;
  private readonly linesHelper: THREE.Mesh;
  private readonly pointer: THREE.Sprite;

  constructor(renderer: THREE.WebGLRenderer) {
    this.controllerModelFactory = new XRControllerModelFactory();
    this.dummyMatrix = new THREE.Matrix4();

    // 初始化辅助对象
    this.linesHelper = this.createRayHelper();
    this.pointer = this.createPointer();

    // 设置控制器
    this.setupControllers(renderer);
  }

  private createRayHelper(): THREE.Mesh {
    const rayLength = 2.0; // 2米长
    const geometry = new THREE.BoxGeometry(0.004, 0.004, rayLength);
    geometry.translate(0, 0, -rayLength / 2);
    this.setupUVCoordinates(geometry);

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      alphaMap: new THREE.CanvasTexture(this.generateRayTexture()),
      transparent: true,
    });

    const helper = new THREE.Mesh(geometry, material);
    helper.renderOrder = Infinity;
    return helper;
  }

  private createPointer(): THREE.Sprite {
    const material = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(this.generatePointerTexture()),
      sizeAttenuation: false,
      depthTest: false,
    });

    const pointer = new THREE.Sprite(material);
    pointer.scale.set(0.015, 0.015, 1);
    pointer.renderOrder = Infinity;
    return pointer;
  }

  private setupUVCoordinates(geometry: THREE.BufferGeometry): void {
    const uvAttribute = geometry.attributes.uv;
    const uvMap = [
      [1, 1],
      [0, 0],
      [1, 1],
      [0, 0],
      [0, 0],
      [1, 1],
      [0, 0],
      [1, 1],
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1],
      [0, 0],
      [0, 0],
    ];

    for (let i = 0; i < uvAttribute.count; i++) {
      const [u, v] = uvMap[i] || [0, 0];
      uvAttribute.setXY(i, u, v);
    }
  }

  private setupControllers(renderer: THREE.WebGLRenderer): void {
    for (let i = 0; i <= 1; i++) {
      const controller = renderer.xr.getController(i);
      if (!controller) continue;
      controller.name = i === 0 ? "controller-right" : "controller-left";
      this.setupControllerVisuals(controller);
      this.controllers.push(controller);

      const grip = renderer.xr.getControllerGrip(i);
      if (grip) {
        grip.add(this.controllerModelFactory.createControllerModel(grip));
        this.controllerGrips.push(grip);
      }
    }
  }

  private setupControllerVisuals(controller: THREE.Group): void {
    const ray = this.linesHelper.clone();
    const point = this.pointer.clone();

    controller.add(ray, point);
    (controller as IController).ray = ray;
    (controller as IController).point = point;
  }

  public setFromController(controllerID: number, ray: THREE.Ray): void {
    const controller = this.controllers[controllerID];
    if (!controller) return;

    this.dummyMatrix.identity().extractRotation(controller.matrixWorld);
    ray.origin.setFromMatrixPosition(controller.matrixWorld);
    ray.direction.set(0, 0, -1).applyMatrix4(this.dummyMatrix);
  }

  public setPointerAt(controllerID: number, vec: THREE.Vector3): void {
    const controller = this.controllers[controllerID];
    if (!controller || !controller.point) return;

    const localVec = controller.worldToLocal(vec.clone());
    controller.point.position.copy(localVec);
    controller.point.visible = true;
  }

  private generateRayTexture(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2d context not available");

    const gradient = ctx.createLinearGradient(0, 0, 64, 0);
    gradient.addColorStop(0, "black");
    gradient.addColorStop(1, "white");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return canvas;
  }

  private generatePointerTexture(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2d context not available");

    ctx.beginPath();
    ctx.arc(32, 32, 29, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fill();
    return canvas;
  }
}
