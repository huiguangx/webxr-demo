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
  initialValue?: boolean;
  fontSize?: number;
  textColor?: THREE.Color | number | string;
  idleOpacity?: number;
  hoveredOpacity?: number;
}

export class ToggleSwitch {
  private block: ThreeMeshUI.Block & IInteractiveObject;
  private toggleKnob: ThreeMeshUI.Block;
  private trackContainer: ThreeMeshUI.Block;
  private textElement: ThreeMeshUI.Text;
  private value: boolean;
  private options: Required<ToggleSwitchOptions>;
  private callback?: (value: boolean) => void;
  private label: string;
  private isToggling: boolean = false; // 防抖标志

  constructor(
    label: string,
    options: ToggleSwitchOptions = {},
    callback?: (value: boolean) => void
  ) {
    this.label = label;
    this.options = {
      width: options.width ?? 0.4,
      height: options.height ?? 0.15,
      onColor: options.onColor ?? 0x27f53c,
      offColor: options.offColor ?? 0xf44336,
      toggleColor: options.toggleColor ?? 0xffffff,
      initialValue: options.initialValue ?? false,
      fontSize: options.fontSize ?? 0.07,
      textColor: options.textColor ?? 0xffffff,
      idleOpacity: options.idleOpacity ?? 0.3,
      hoveredOpacity: options.hoveredOpacity ?? 1,
    };

    this.value = this.options.initialValue;
    this.callback = callback;

    // 直接使用轨道作为主容器，去掉外框
    this.block = new ThreeMeshUI.Block({
      width: this.options.width,
      height: this.options.height,
      borderRadius: this.options.height * 0.5, // 完全圆角，形成椭圆
      backgroundColor: new THREE.Color(
        this.value ? this.options.onColor : this.options.offColor
      ),
      backgroundOpacity: 0.8,
      justifyContent: "center",
      alignItems: "center",
      margin: 0.02,
    }) as ThreeMeshUI.Block & IInteractiveObject;

    // 轨道容器就是主容器本身
    this.trackContainer = this.block;

    // 创建文本标签（如果需要的话可以单独处理）
    this.textElement = new ThreeMeshUI.Text({
      content: this.label,
      fontSize: this.options.fontSize * 0.5,
      fontColor: new THREE.Color(this.options.textColor),
    });

    // 创建滑块（小圆形）
    this.toggleKnob = new ThreeMeshUI.Block({
      width: this.options.height * 0.7, // 稍微大一点，更像真实开关
      height: this.options.height * 0.7,
      borderRadius: this.options.height * 0.35, // 完全圆形
      backgroundColor: new THREE.Color(this.options.toggleColor),
      backgroundOpacity: 1,
    });
    this.trackContainer.add(this.toggleKnob);

    // 设置滑块初始位置
    this.updateKnobPosition();

    // 标记为UI交互对象
    this.block.isUI = true;
    this.block.setState = (state: string) => {
      this.handleStateChange(state);
    };

    // 初始化当前状态
    (this.block as IInteractiveObject).__currentState = "idle";

    console.log("ToggleSwitch created", this);
  }

  private handleStateChange(state: string): void {
    // 获取当前状态
    const currentState =
      (this.block as IInteractiveObject).__currentState || "idle";
    console.log(`ToggleSwitch state changing from ${currentState} to ${state}`);

    // 如果正在切换中，忽略新的状态变化
    if (this.isToggling && state === "selected") {
      console.log("Ignoring toggle request - already toggling");
      return;
    }

    switch (state) {
      case "hovered":
        if ((this.block as any).set) {
          (this.block as any).set({
            backgroundOpacity: this.options.hoveredOpacity,
          });
        }
        (this.block as IInteractiveObject).__currentState = "hovered";
        break;

      case "selected":
        // 防抖机制：设置切换标志
        this.isToggling = true;
        (this.block as IInteractiveObject).__currentState = "selected";

        // 执行切换
        this.toggle();

        // 短暂延迟后恢复状态，防止重复触发
        setTimeout(() => {
          this.isToggling = false;
          (this.block as IInteractiveObject).__currentState = "idle";
          // 恢复透明度
          if ((this.block as any).set) {
            (this.block as any).set({
              backgroundOpacity: 0.8,
            });
          }
        }, 200); // 200ms 防抖时间
        break;

      default: // idle
        // 只有在不是切换状态时才处理idle
        if (!this.isToggling) {
          if ((this.block as any).set) {
            (this.block as any).set({
              backgroundOpacity: 0.8,
            });
          }
          (this.block as IInteractiveObject).__currentState = "idle";
        }
        break;
    }
  }

  private updateKnobPosition(): void {
    // 使用轨道的实际宽度进行计算
    const trackWidth = this.options.width; // 轨道宽度
    const knobWidth = this.options.height * 0.7; // 滑块宽度
    const availableSpace = trackWidth - knobWidth - 0.02; // 减去一些边距

    // 滑块位置：关闭时在左侧，开启时在右侧，使用更保守的位置避免超出边界
    const xPos = this.value ? availableSpace * 0.3 : -availableSpace * 0.3;

    // 平滑设置位置，避免晃动
    if (this.toggleKnob.position.x !== xPos) {
      this.toggleKnob.position.setX(xPos);
    }

    // 更新轨道背景色
    if ((this.trackContainer as any).set) {
      (this.trackContainer as any).set({
        backgroundColor: new THREE.Color(
          this.value ? this.options.onColor : this.options.offColor
        ),
      });
    }

    console.log(
      "ToggleSwitch position updated, value:",
      this.value,
      "xPos:",
      xPos
    );
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

  /**
   * 根据外部状态更新开关颜色和文案（只支持 true/false 两种状态）
   * @param value 开关状态值（true 或 false）
   * @param onLabel 开启状态下的文案（可选）
   * @param offLabel 关闭状态下的文案（可选）
   */
  public updateSwitchState(
    value: boolean,
    onLabel?: string,
    offLabel?: string
  ): void {
    // 确保只有 true 或 false 两种状态
    const normalizedValue = Boolean(value);
    console.log(`Updating switch state to ${normalizedValue ? "ON" : "OFF"}`);

    // 只有当状态真正发生变化时才更新
    if (this.value !== normalizedValue) {
      this.value = normalizedValue;
      this.updateKnobPosition();

      // 更新文本内容
      if (this.textElement) {
        const newContent = normalizedValue
          ? onLabel || this.label
          : offLabel || this.label;

        (this.textElement as any).set({
          content: newContent,
        });

        console.log(`Switch text updated to "${newContent}"`);
      }

      console.log(`Switch state updated to ${normalizedValue ? "ON" : "OFF"}`);
    } else {
      console.log(`Switch state unchanged: ${normalizedValue ? "ON" : "OFF"}`);
    }
  }

  public getObject3D(): ThreeMeshUI.Block & IInteractiveObject {
    return this.block;
  }

  public dispose(): void {
    // ToggleSwitch不需要特别清理，因为事件处理由InteractionManager统一管理
  }
}
