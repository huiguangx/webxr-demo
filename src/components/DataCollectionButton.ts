import * as THREE from "three";
import ThreeMeshUI from "three-mesh-ui";

interface IInteractiveObject extends THREE.Object3D {
  isUI?: boolean;
  setState?: (state: string) => void;
  set?: (options: object) => void;
}

interface DataCollectionButtonOptions {
  panelWidth?: number;
  panelHeight?: number;
  buttonSize?: number;
  fontSize?: number;
  onColor?: THREE.Color | number | string;
  offColor?: THREE.Color | number | string;
  pauseColor?: THREE.Color | number | string;
  initialValue?: boolean;
}

export class DataCollectionButton {
  private panel: ThreeMeshUI.Block & IInteractiveObject;
  private button: ThreeMeshUI.Block & IInteractiveObject;
  private statusLight: ThreeMeshUI.Block & IInteractiveObject;
  private titleText: ThreeMeshUI.Text;
  private statusText: ThreeMeshUI.Text & IInteractiveObject;
  private value: "on" | "off" | "pause";
  private options: Required<DataCollectionButtonOptions>;
  private callback?: (value: "on" | "off" | "pause") => void;

  // 状态属性
  private idleStateAttributes: object;
  private hoveredStateAttributes: object;
  private selectedStateAttributes: object;

  constructor(
    label: string,
    options: DataCollectionButtonOptions = {},
    callback?: (value: "on" | "off" | "pause") => void
  ) {
    this.options = {
      panelWidth: options.panelWidth ?? 0.3,
      panelHeight: options.panelHeight ?? 0.3,
      buttonSize: options.buttonSize ?? 0.25,
      fontSize: options.fontSize ?? 0.07,
      onColor: options.onColor ?? 0x4caf50, // 绿色
      offColor: options.offColor ?? 0x9e9e9e, // 灰色
      pauseColor: options.pauseColor ?? 0xf44336, // 红色
      initialValue: options.initialValue ?? false,
    };

    this.value = this.options.initialValue ? "on" : "off";
    this.callback = callback;

    // 初始化状态属性
    this.idleStateAttributes = {
      backgroundColor: new THREE.Color(0x666666),
      backgroundOpacity: 1,
    };

    this.hoveredStateAttributes = {
      backgroundColor: new THREE.Color(0x999999),
      backgroundOpacity: 1,
    };

    this.selectedStateAttributes = {
      backgroundColor: new THREE.Color(0x777777),
      backgroundOpacity: 1,
    };

    // === 外层面板 ===
    this.panel = new ThreeMeshUI.Block({
      width: this.options.panelWidth,
      height: this.options.panelHeight,
      backgroundColor: new THREE.Color(0x222222),
      borderRadius: 0.05,
      justifyContent: "center",
      contentDirection: "column",
      padding: 0.05,
    }) as ThreeMeshUI.Block & IInteractiveObject;

    this.panel.isUI = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.panel.setState = (_: string) => {
      // 面板本身不需要特殊的状态视觉反馈
    };

    // === 标题 ===
    this.titleText = new ThreeMeshUI.Text({
      content: label,
      fontSize: this.options.fontSize,
      fontColor: new THREE.Color(0xffffff),
    });
    this.panel.add(this.titleText);

    // === 状态灯 ===
    this.statusLight = new ThreeMeshUI.Block({
      width: 0.04,
      height: 0.04,
      borderRadius: 0.02,
      backgroundColor: new THREE.Color(this.getCurrentLightColor()),
      margin: 0.02,
    }) as ThreeMeshUI.Block & IInteractiveObject;
    this.panel.add(this.statusLight);

    // === 圆形按钮 ===
    this.button = new ThreeMeshUI.Block({
      width: this.options.buttonSize,
      height: this.options.buttonSize,
      borderRadius: this.options.buttonSize / 2,
      backgroundColor: new THREE.Color(this.getCurrentButtonColor()),
      justifyContent: "center",
    }) as ThreeMeshUI.Block & IInteractiveObject;

    // 设置按钮的交互属性
    this.button.isUI = true;
    this.button.setState = (state: string) => {
      this.handleButtonStateChange(state);
    };

    const buttonLabel = new ThreeMeshUI.Text({
      content: this.value === "on" ? "采开" : "开启",
      fontSize: this.options.fontSize,
      fontColor: new THREE.Color(0xffffff),
    });
    this.button.add(buttonLabel);

    this.panel.add(this.button);

    // === 状态文字 ===
    this.statusText = new ThreeMeshUI.Text({
      content: this.getStatusText(),
      fontSize: this.options.fontSize * 0.8,
      fontColor: new THREE.Color(0xffffff),
    }) as ThreeMeshUI.Text & IInteractiveObject;
    this.panel.add(this.statusText);

    this.updateUI();
  }

  private handleButtonStateChange(state: string): void {
    switch (state) {
      case "hovered":
        if (this.button.set) {
          this.button.set(this.hoveredStateAttributes);
        }
        break;
      case "selected":
        if (this.button.set) {
          this.button.set(this.selectedStateAttributes);
        }
        // 延迟执行toggle，确保视觉反馈能被看到
        setTimeout(() => {
          this.toggle();
          // 恢复到当前状态对应的颜色
          if (this.button.set) {
            this.button.set({
              backgroundColor: new THREE.Color(this.getCurrentButtonColor()),
            });
          }
        }, 100);
        break;
      default:
        if (this.button.set) {
          this.button.set({
            backgroundColor: new THREE.Color(this.getCurrentButtonColor()),
          });
        }
        break;
    }
  }

  private getCurrentLightColor() {
    return this.value === "on"
      ? this.options.onColor
      : this.value === "pause"
      ? this.options.pauseColor
      : this.options.offColor;
  }

  private getCurrentButtonColor() {
    return this.value === "on"
      ? 0x2e7d32
      : this.value === "pause"
      ? 0xff7043
      : 0x616161;
  }

  private getStatusText() {
    return this.value === "on"
      ? "采集中…"
      : this.value === "pause"
      ? "已暂停"
      : "采集已关闭";
  }

  private toggle() {
    if (this.value === "off") {
      this.value = "on";
    } else if (this.value === "on") {
      this.value = "pause";
    } else {
      this.value = "off";
    }
    this.updateUI();
    if (this.callback) this.callback(this.value);
  }

  private updateUI() {
    // 安全更新状态灯
    if (this.statusLight && this.statusLight.set) {
      this.statusLight.set({
        backgroundColor: new THREE.Color(this.getCurrentLightColor()),
      });
    }

    // 安全更新按钮背景色（保持状态交互颜色）
    if (this.button && this.button.set) {
      this.button.set({
        backgroundColor: new THREE.Color(this.getCurrentButtonColor()),
      });
    }

    // 安全更新状态文本
    if (this.statusText && this.statusText.set) {
      this.statusText.set({
        content: this.getStatusText(),
      });
    }
  }

  // 添加setValue方法，用于外部设置按钮状态
  public setValue(isCollecting: boolean): void {
    this.value = isCollecting ? "on" : "off";
    this.updateUI();
  }

  // 添加更新状态文本的方法
  public updateStatusText(text: string): void {
    if (this.statusText && this.statusText.set) {
      this.statusText.set({
        content: text,
      });
    }
  }

  public getObject3D() {
    return this.panel;
  }
}
