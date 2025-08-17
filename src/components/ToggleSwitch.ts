import * as THREE from "three";
import ThreeMeshUI from "three-mesh-ui";

interface IInteractiveObject extends THREE.Object3D {
  isUI?: boolean;
  setState?: (state: string) => void;
  __currentState?: string;
}

interface ToggleSwitchOptions {
  width?: number;
  height?: number;
  onColor?: THREE.Color | number | string;
  offColor?: THREE.Color | number | string;
  toggleColor?: THREE.Color | number | string;
  fontSize?: number;
  textColor?: THREE.Color | number | string;
  idleOpacity?: number;
  hoveredOpacity?: number;
  enableRotation?: boolean;
  rotationAngle?: number;
  loadingStyle?: "dots" | "ring";
}

export class ToggleSwitch {
  private block: ThreeMeshUI.Block & IInteractiveObject;
  private toggleKnob: ThreeMeshUI.Block;
  private trackContainer: ThreeMeshUI.Block;
  private textElement: ThreeMeshUI.Text;
  private value: boolean;
  private options: Required<ToggleSwitchOptions>;
  private callback?: () => void;

  private isLoading: boolean = false;
  private loadingDots: THREE.Mesh[] = [];
  private dotMaterial: THREE.MeshBasicMaterial;
  private loadingRing?: THREE.Mesh;

  constructor(
    label: string,
    options: ToggleSwitchOptions = {},
    callback?: () => void
  ) {
    this.options = {
      width: options.width ?? 0.4,
      height: options.height ?? 0.15,
      onColor: options.onColor ?? 0x27f53c,
      offColor: options.offColor ?? 0xd9d9d9,
      toggleColor: options.toggleColor ?? 0xffffff,
      fontSize: options.fontSize ?? 0.07,
      textColor: options.textColor ?? 0xffffff,
      idleOpacity: options.idleOpacity ?? 0.3,
      hoveredOpacity: options.hoveredOpacity ?? 1,
      enableRotation: options.enableRotation ?? true,
      rotationAngle: options.rotationAngle ?? Math.PI / 4,
      loadingStyle: options.loadingStyle ?? "ring",
    };
    this.callback = callback;
    this.value = false;
    this.isLoading = false;

    // 主容器
    this.block = new ThreeMeshUI.Block({
      width: this.options.width,
      height: this.options.height,
      borderRadius: this.options.height * 0.5,
      backgroundColor: new THREE.Color(this.options.offColor),
      backgroundOpacity: 0.8,
      justifyContent: "center",
      alignItems: "flex-start",
      margin: 0.02,
    }) as ThreeMeshUI.Block & IInteractiveObject;

    this.trackContainer = this.block;

    // 滑块
    this.toggleKnob = new ThreeMeshUI.Block({
      width: this.options.height * 0.9,
      height: this.options.height * 0.9,
      borderRadius: this.options.height * 0.45,
      backgroundColor: new THREE.Color(this.options.toggleColor),
      backgroundOpacity: 1,
    });

    this.dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xc7c1c1,
      transparent: true,
      opacity: 0.8,
    });

    if (this.options.loadingStyle === "dots") {
      const dotSize = this.options.height * 0.08;
      const dotGeometry = new THREE.CircleGeometry(dotSize / 2, 16);
      for (let i = 0; i < 3; i++) {
        const dot = new THREE.Mesh(dotGeometry, this.dotMaterial);
        dot.position.set(0, 0, 0.01);
        dot.visible = false;
        this.loadingDots.push(dot);
        (this.toggleKnob as unknown as THREE.Object3D).add(dot);
      }
    } else {
      this.createLoadingRing();
    }
    this.trackContainer.add(this.toggleKnob);
    setTimeout(() => {
      this.updateKnobPosition();
    }, 500);
    this.block.isUI = true;
    this.block.setState = (state: string) => {
      if (state === "selected") this.handleClick();
    };
  }

  private createLoadingRing(): void {
    const outerRadius = this.options.height * 0.35;
    const innerRadius = outerRadius * 0.55;
    const geometry = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      32,
      1,
      0,
      Math.PI * 1.5
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.loadingRing = new THREE.Mesh(geometry, material);
    this.loadingRing.position.set(0, 0, 0.02);
    this.loadingRing.visible = false;
    (this.toggleKnob as unknown as THREE.Object3D).add(this.loadingRing);
  }

  /** 点击事件，只触发回调，不改变开关状态 */
  public handleClick(): void {
    console.log("Toggle clicked, call backend API...");
    this.callback?.();
  }

  /** 根据后台状态更新显示 */
  public updateFromServer(state: number): void {
    switch (state) {
      case -2: // 红色 false
        this.isLoading = false;
        this.value = false;
        break;
      case -1: // loading
        this.isLoading = true;
        break;
      case 0:
      case 1:
      case 2: // 绿色 true
        this.isLoading = false;
        this.value = true;
        break;
    }
    this.updateKnobPosition();
  }

  /** 更新滑块位置和 loading 显示 */
  private updateKnobPosition(): void {
    // 使用ThreeMeshUI的flexbox布局系统来控制knob位置
    // this.value = Math.random() < 0.5; 模拟后端接口
    (this.trackContainer as any).set?.({
      alignItems: this.value ? "end" : "start",
      backgroundColor: new THREE.Color(
        this.value ? this.options.onColor : this.options.offColor
      ),
      backgroundOpacity: 0.8,
    });

    this.loadingDots.forEach((dot) => (dot.visible = this.isLoading));
    if (this.loadingRing) this.loadingRing.visible = this.isLoading;
  }

  /** 外部渲染循环中调用更新 ring 旋转 */
  public update(delta: number): void {
    if (this.loadingRing && this.isLoading) {
      this.loadingRing.rotation.z -= delta * 0.05; // delta 时间控制速度
    }
  }

  public getObject3D(): ThreeMeshUI.Block & IInteractiveObject {
    return this.block;
  }

  public dispose(): void {
    this.dotMaterial.dispose();
    if (this.loadingRing) {
      (this.loadingRing.material as THREE.Material).dispose();
      this.loadingRing.geometry.dispose();
    }
  }
}
