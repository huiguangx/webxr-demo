import * as THREE from "three";
import ThreeMeshUI from "three-mesh-ui";

interface IInteractiveObject extends THREE.Object3D {
  isUI?: boolean;
  setState?: (state: string) => void;
  set?: (options: object) => void;
}

interface SimpleButtonOptions {
  width?: number;
  height?: number;
  borderRadius?: number;
  fontSize?: number;
  backgroundColor?: THREE.Color | number | string;
  hoverColor?: THREE.Color | number | string;
  activeColor?: THREE.Color | number | string;
  textColor?: THREE.Color | number | string;
}

export class SimpleButton {
  private block: ThreeMeshUI.Block & IInteractiveObject;
  private options: Required<SimpleButtonOptions>;
  private callback?: () => void;
  private label: string;

  constructor(
    label: string,
    options: SimpleButtonOptions = {},
    callback?: () => void
  ) {
    this.label = label;
    this.callback = callback;

    this.options = {
      width: options.width ?? 0.4,
      height: options.height ?? 0.15,
      borderRadius: options.borderRadius ?? 0.075,
      fontSize: options.fontSize ?? 0.07,
      backgroundColor: options.backgroundColor ?? 0x666666,
      hoverColor: options.hoverColor ?? 0x999999,
      activeColor: options.activeColor ?? 0x777777,
      textColor: options.textColor ?? 0xffffff,
    };

    // 创建按钮容器
    this.block = new ThreeMeshUI.Block({
      width: this.options.width,
      height: this.options.height,
      borderRadius: this.options.borderRadius,
      backgroundColor: new THREE.Color(this.options.backgroundColor),
      backgroundOpacity: 1,
      justifyContent: "center",
      offset: 0.05,
    }) as ThreeMeshUI.Block & IInteractiveObject;

    // 标记为UI交互对象
    this.block.isUI = true;
    this.block.setState = (state: string) => {
      this.handleStateChange(state);
    };

    // 创建按钮文本
    const buttonText = new ThreeMeshUI.Text({
      content: this.label,
      fontSize: this.options.fontSize,
      fontColor: new THREE.Color(this.options.textColor),
    });

    // 将文本添加到按钮
    this.block.add(buttonText);
    
    console.log("SimpleButton created", this);
  }

  private handleStateChange(state: string): void {
    console.log("SimpleButton state change:", state);
    switch (state) {
      case "hovered":
        if (this.block.set) {
          this.block.set({
            backgroundColor: new THREE.Color(this.options.hoverColor),
          });
        }
        break;
      case "selected":
        if (this.block.set) {
          this.block.set({
            backgroundColor: new THREE.Color(this.options.activeColor),
          });
        }
        // 触发回调
        if (this.callback) {
          this.callback();
        }
        // 恢复默认状态
        setTimeout(() => {
          if (this.block.set) {
            this.block.set({
              backgroundColor: new THREE.Color(this.options.backgroundColor),
            });
          }
        }, 150);
        break;
      default:
        if (this.block.set) {
          this.block.set({
            backgroundColor: new THREE.Color(this.options.backgroundColor),
          });
        }
        break;
    }
  }

  public getObject3D(): ThreeMeshUI.Block & IInteractiveObject {
    return this.block;
  }

  public dispose(): void {
    // SimpleButton不需要特别清理，因为事件处理由InteractionManager统一管理
  }
}