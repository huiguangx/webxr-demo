import * as THREE from "three";
import ThreeMeshUI from "three-mesh-ui";

interface IInteractiveObject extends THREE.Object3D {
  isUI?: boolean;
  setState?: (state: string) => void;
  set?: (options: object) => void;
  __currentState?: string;
}

interface InteractiveButtonOptions {
  width?: number;
  height?: number;
  borderRadius?: number;
  fontSize?: number;
  textColor?: THREE.Color | number | string;
  idleColor?: THREE.Color | number | string;
  hoveredColor?: THREE.Color | number | string;
  selectedColor?: THREE.Color | number | string;
  idleOpacity?: number;
  hoveredOpacity?: number;
  selectedOpacity?: number;
}

export class InteractiveButton {
  private block: ThreeMeshUI.Block & IInteractiveObject;
  private options: Required<InteractiveButtonOptions>;
  private callback?: () => void;
  private label: string;
  private textElement: ThreeMeshUI.Text;

  // 状态属性
  private idleStateAttributes: object;
  private hoveredStateAttributes: object;
  private selectedStateAttributes: object;

  constructor(
    label: string,
    options: InteractiveButtonOptions = {},
    callback?: () => void
  ) {
    this.label = label;
    this.callback = callback;

    this.options = {
      width: options.width ?? 0.4,
      height: options.height ?? 0.2,
      borderRadius: options.borderRadius ?? 0.035,
      fontSize: options.fontSize ?? 0.07,
      textColor: options.textColor ?? 0xffffff,
      idleColor: options.idleColor ?? 0x663336,
      hoveredColor: options.hoveredColor ?? 0x9aa999,
      selectedColor: options.selectedColor ?? 0x27f53c,
      idleOpacity: options.idleOpacity ?? 0.3,
      hoveredOpacity: options.hoveredOpacity ?? 1,
      selectedOpacity: options.selectedOpacity ?? 1,
    };

    // 初始化状态属性
    this.idleStateAttributes = {
      backgroundColor: new THREE.Color(this.options.idleColor),
      backgroundOpacity: this.options.idleOpacity,
      fontColor: new THREE.Color(this.options.textColor),
    };

    this.hoveredStateAttributes = {
      backgroundColor: new THREE.Color(this.options.hoveredColor),
      backgroundOpacity: this.options.hoveredOpacity,
      fontColor: new THREE.Color(this.options.textColor),
    };

    this.selectedStateAttributes = {
      backgroundColor: new THREE.Color(this.options.selectedColor),
      backgroundOpacity: this.options.selectedOpacity,
      fontColor: new THREE.Color(this.options.textColor),
    };

    // 创建按钮
    this.block = new ThreeMeshUI.Block({
      width: this.options.width,
      height: this.options.height,
      borderRadius: this.options.borderRadius,
      backgroundColor: new THREE.Color(this.options.idleColor),
      backgroundOpacity: this.options.idleOpacity,
      justifyContent: "center",
      offset: 0.05,
      margin: 0.02,
    }) as ThreeMeshUI.Block & IInteractiveObject;

    // 添加文本
    this.textElement = new ThreeMeshUI.Text({
      content: this.label,
      fontSize: this.options.fontSize,
      fontColor: new THREE.Color(this.options.textColor),
    });
    this.block.add(this.textElement);

    // 设置交互属性
    this.block.isUI = true;
    this.block.setState = (state: string) => {
      this.handleStateChange(state);
    };

    // 初始化当前状态
    (this.block as IInteractiveObject).__currentState = "idle";
  }

  private handleStateChange(state: string): void {
    // 获取当前状态
    const currentState =
      (this.block as IInteractiveObject).__currentState || "idle";
    console.log(`Button state changing from ${currentState} to ${state}`);

    // 如果当前是active状态（由轮询设置），则不处理idle状态变化
    if (currentState === "active" && state === "idle") {
      console.log(
        "Skipping idle state change because button is in active state"
      );
      return;
    }

    switch (state) {
      case "hovered":
        if (this.block.set) {
          this.block.set(this.hoveredStateAttributes);
        }
        (this.block as IInteractiveObject).__currentState = "hovered";
        break;
      case "selected":
        if (this.block.set) {
          this.block.set(this.selectedStateAttributes);
        }
        (this.block as IInteractiveObject).__currentState = "selected";
        // 执行回调
        if (this.callback) {
          this.callback();
        }
        // 恢复到空闲状态
        setTimeout(() => {
          if (this.block.set) {
            this.block.set(this.idleStateAttributes);
          }
          // 重置对象的当前状态，以便下次交互正常工作
          (this.block as IInteractiveObject).__currentState = "idle";
        }, 100);
        break;
      default:
        // 只有在不是由轮询设置的"active"状态时才恢复到idle状态
        if (currentState !== "active" && this.block.set) {
          this.block.set(this.idleStateAttributes);
        }
        // 不要覆盖"active"状态
        if (currentState !== "active") {
          (this.block as IInteractiveObject).__currentState = "idle";
        }
        break;
    }
  }

  /**
   * 根据外部状态更新按钮颜色和文案
   * @param isActive 按钮是否处于激活状态
   * @param activeLabel 激活状态下的文案（可选）
   * @param inactiveLabel 非激活状态下的文案（可选）
   */
  public updateButtonState(
    isActive: boolean,
    activeLabel?: string,
    inactiveLabel?: string
  ): void {
    console.log(`Updating button state to ${isActive ? "active" : "inactive"}`);

    // 更新背景颜色和透明度
    if (this.block.set) {
      this.block.set({
        backgroundColor: new THREE.Color(
          isActive ? this.options.selectedColor : this.options.idleColor
        ),
        backgroundOpacity: isActive
          ? this.options.hoveredOpacity
          : this.options.idleOpacity,
      });
    }

    // 更新文本内容
    if (this.textElement) {
      const newContent = isActive
        ? activeLabel || "opening"
        : inactiveLabel || "close";

      (this.textElement as any).set({
        content: newContent,
      });

      console.log(`Button text updated to "${newContent}"`);
    }

    // 更新当前状态跟踪
    (this.block as IInteractiveObject).__currentState = isActive
      ? "active"
      : "idle";

    console.log(`Button state updated to ${isActive ? "active" : "idle"}`);
  }

  public getObject3D(): ThreeMeshUI.Block & IInteractiveObject {
    return this.block;
  }

  public dispose(): void {
    // InteractiveButton不需要特别清理，因为事件处理由InteractionManager统一管理
  }
}
