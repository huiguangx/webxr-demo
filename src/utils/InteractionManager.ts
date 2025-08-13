// 定义交互对象接口
import * as THREE from "three";
import VRControl from "./VRControl";
export interface IInteractiveObject extends THREE.Object3D {
  isUI?: boolean;
  setState?: (state: string) => void;
}

// 交互管理器类
export class InteractionManager {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private objsToTest: IInteractiveObject[] = [];
  private selectState: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private vrControl: VRControl;

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    scene: THREE.Scene
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(NaN, NaN);

    this.vrControl = new VRControl(renderer);

    // 确保在构造函数中就添加控制器到场景
    this.setupScene();

    this.setupEventListeners();
  }
  public getControllerCount(): number {
    return this.vrControl.controllers.length;
  }
  private setupScene(): void {
    // 添加控制器和手柄到场景
    this.scene.add(
      this.vrControl.controllerGrips[0],
      this.vrControl.controllers[0],
      this.vrControl.controllerGrips[1],
      this.vrControl.controllers[1]
    );
    console.log("添加控制器到场景");

    // 隐藏控制器直到XR会话开始
    this.vrControl.controllerGrips[0].visible = false;
    this.vrControl.controllers[0].visible = false;
    this.vrControl.controllerGrips[1].visible = false;
    this.vrControl.controllers[1].visible = false;

    // 监听XR会话开始和结束事件来控制控制器的可见性
    this.renderer.xr.addEventListener("sessionstart", () => {
      console.log("XR会话开始，设置控制器为可见");
      this.vrControl.controllerGrips[0].visible = true;
      this.vrControl.controllers[0].visible = true;
      this.vrControl.controllerGrips[1].visible = true;
      this.vrControl.controllers[1].visible = true;
    });

    this.renderer.xr.addEventListener("sessionend", () => {
      console.log("XR会话结束，设置控制器为不可见");
      this.vrControl.controllerGrips[0].visible = false;
      this.vrControl.controllers[0].visible = false;
      this.vrControl.controllerGrips[1].visible = false;
      this.vrControl.controllers[1].visible = false;
    });
  }

  private setupEventListeners(): void {
    window.addEventListener("pointermove", (event: PointerEvent) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener("pointerdown", () => {
      console.log("Pointer down");
      this.selectState = true;
    });

    window.addEventListener("pointerup", () => {
      console.log("Pointer up");
      this.selectState = false;
    });

    window.addEventListener("touchstart", (event: TouchEvent) => {
      console.log("Touch start");
      this.selectState = true;
      this.mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener("touchend", () => {
      console.log("Touch end");
      this.selectState = false;
      this.mouse.set(NaN, NaN);
    });

    // 通过类型断言解决事件类型问题
    this.vrControl.controllers[0].addEventListener("selectstart" as any, () => {
      console.log("Controller 0 select start");
      this.selectState = true;
    });

    this.vrControl.controllers[0].addEventListener("selectend" as any, () => {
      console.log("Controller 0 select end");
      this.selectState = false;
    });

    this.vrControl.controllers[1].addEventListener("selectstart" as any, () => {
      console.log("Controller 1 select start");
      this.selectState = true;
    });

    this.vrControl.controllers[1].addEventListener("selectend" as any, () => {
      console.log("Controller 1 select end");
      this.selectState = false;
    });
  }

  public addInteractiveObject(obj: IInteractiveObject): void {
    console.log("Adding interactive object", obj);
    this.objsToTest.push(obj);
  }

  public update(): void {
    // console.log("InteractionManager update called");
    let intersect: THREE.Intersection | null = null;
    if (this.renderer.xr.isPresenting) {
      this.vrControl.setFromController(0, this.raycaster.ray);
      intersect = this.raycast();
      if (intersect) {
        this.vrControl.setPointerAt(0, intersect.point);
      } else {
        this.vrControl.setFromController(1, this.raycaster.ray);
        intersect = this.raycast();

        if (intersect) {
          this.vrControl.setPointerAt(1, intersect.point);
        }
      }
    } else if (!isNaN(this.mouse.x) && !isNaN(this.mouse.y)) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      intersect = this.raycast();
    }

    this.updateObjectStates(intersect);
  }

  private updateObjectStates(intersect: THREE.Intersection | null): void {
    // console.log("updateObjectStates called, intersect:", intersect, "selectState:", this.selectState);
    this.objsToTest.forEach((obj) => {
      if (!obj.isUI) return;

      if (intersect && obj === intersect.object) {
        const state = this.selectState ? "selected" : "hovered";
        // console.log("Setting object state:", state, obj);
        obj.setState?.(state);
      } else {
        // console.log("Setting object state: idle", obj);
        obj.setState?.("idle");
      }
    });
  }

  private raycast(): THREE.Intersection | null {
    // console.log("Raycast called, objects to test:", this.objsToTest.length);
    return this.objsToTest.reduce((closest: THREE.Intersection | null, obj) => {
      const intersections = this.raycaster.intersectObject(obj, true);
      if (!intersections[0]) return closest;

      if (!closest || intersections[0].distance < closest.distance) {
        const result = intersections[0];
        (
          result as unknown as THREE.Intersection & { object: THREE.Object3D }
        ).object = obj;
        console.log("Raycast hit:", obj);
        return result;
      }

      return closest;
    }, null);
  }
}