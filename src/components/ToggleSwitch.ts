import * as THREE from "three";
import ThreeMeshUI from "three-mesh-ui";

interface IInteractiveObject extends THREE.Object3D {
  isUI?: boolean;
  setState?: (state: string) => void;
}

interface ToggleSwitchOptions {
  width?: number;
  height?: number;
  onColor?: THREE.Color | number | string;
  offColor?: THREE.Color | number | string;
  toggleColor?: THREE.Color | number | string;
  initialValue?: boolean;
  fontSize?: number;
}

export class ToggleSwitch {
  private block: ThreeMeshUI.Block & IInteractiveObject;
  private toggleKnob: ThreeMeshUI.Block;
  private value: boolean;
  private options: Required<ToggleSwitchOptions>;
  private callback?: (value: boolean) => void;

  constructor(
    label: string,
    options: ToggleSwitchOptions = {},
    callback?: (value: boolean) => void
  ) {
    this.options = {
      width: options.width ?? 0.4,
      height: options.height ?? 0.15,
      onColor: options.onColor ?? 0x4caf50,
      offColor: options.offColor ?? 0xf44336,
      toggleColor: options.toggleColor ?? 0xffffff,
      initialValue: options.initialValue ?? false,
      fontSize: options.fontSize ?? 0.07,
    };

    this.value = this.options.initialValue;
    this.callback = callback;

    // 创建开关容器
    this.block = new ThreeMeshUI.Block({
      width: this.options.width,
      height: this.options.height,
      borderRadius: this.options.height / 2,
      backgroundColor: new THREE.Color(this.value ? this.options.onColor : this.options.offColor),
      backgroundOpacity: 1,
      justifyContent: "center",
      contentDirection: "row",
      offset: 0.05,
    }) as ThreeMeshUI.Block & IInteractiveObject;

    // 标记为UI交互对象
    this.block.isUI = true;
    this.block.setState = (state: string) => {
      console.log("ToggleSwitch state change:", state);
      this.handleStateChange(state);
    };

    // 创建开关滑块
    this.toggleKnob = new ThreeMeshUI.Block({
      width: this.options.height * 0.8,
      height: this.options.height * 0.8,
      borderRadius: this.options.height * 0.4,
      backgroundColor: new THREE.Color(this.options.toggleColor),
      backgroundOpacity: 1,
      offset: 0.05,
    });

    // 设置滑块初始位置
    this.updateKnobPosition();

    // 将滑块添加到容器
    this.block.add(this.toggleKnob);
    
    console.log("ToggleSwitch created", this);
  }

  private handleStateChange(state: string): void {
    console.log("ToggleSwitch handleStateChange:", state, "current value:", this.value);
    // 状态处理（悬停、选中等）
    if (state === "selected") {
      this.toggle();
    }
  }

  private updateKnobPosition(): void {
    // 更新滑块位置基于当前值
    const containerWidth = this.options.width - this.options.height * 0.8;
    const xPos = this.value ? containerWidth / 2 : -containerWidth / 2;
    this.toggleKnob.position.setX(xPos);
    
    // 更新背景色
    (this.block as any).set({
      backgroundColor: new THREE.Color(this.value ? this.options.onColor : this.options.offColor),
    });
    
    console.log("ToggleSwitch position updated, value:", this.value);
  }

  private toggle(): void {
    console.log("ToggleSwitch toggle called, old value:", this.value);
    this.value = !this.value;
    this.updateKnobPosition();
    if (this.callback) {
      this.callback(this.value);
    }
    console.log("ToggleSwitch toggled, new value:", this.value);
  }

  public getValue(): boolean {
    return this.value;
  }

  public setValue(value: boolean): void {
    if (this.value !== value) {
      console.log("ToggleSwitch setValue called:", value);
      this.value = value;
      this.updateKnobPosition();
    }
  }

  public getObject3D(): ThreeMeshUI.Block & IInteractiveObject {
    return this.block;
  }


  public dispose(): void {
    // ToggleSwitch不需要特别清理，因为事件处理由InteractionManager统一管理
  }
}