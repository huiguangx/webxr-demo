import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BoxLineGeometry } from "three/examples/jsm/geometries/BoxLineGeometry.js";
import ThreeMeshUI from "three-mesh-ui";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { InteractionManager } from "../utils/InteractionManager";
import { DataCollectionButton } from "./DataCollectionButton";
import { debounce } from "../utils/debounce";

// 定义交互对象接口
interface IInteractiveObject extends THREE.Object3D {
  isUI?: boolean;
  setState?: (state: string) => void;
  __currentState?: string;
}

import rawJSON from "@/assets/Roboto-msdf.json?raw";
import FontImage from "@/assets/Roboto-msdf.png";
// import ThreeIcon from "@/assets/threejs.png";
const FontJSON = JSON.parse(rawJSON);

// 导入各种组件
import { ToggleSwitch } from "./ToggleSwitch";
import { InteractiveButton } from "./InteractiveButton";
import { SimpleButton } from "./SimpleButton";

interface PanelContentText {
  type: "text";
  content: string;
  fontSize?: number;
  fontColor?: THREE.Color | number | string;
  borderRadius?: number;
  lineHeight?: number; // 添加行高选项
}

interface PanelContentImage {
  type: "image";
  texture: string;
  width?: number;
  height?: number;
  backgroundColor?: THREE.Color | number | string;
  backgroundOpacity?: number;
  borderRadius?: number; // 👈 新增字段
}

interface PanelOptions {
  key?: string; // 唯一标识
  borderRadius?: number; // 面板圆角
  aspectRatio?: number;
  fontSize?: number; // 添加字体大小选项
  interLine?: number; // 添加行间距选项
  // 以后可以扩展，比如背景色、边框等
}

type PanelContent = PanelContentText | PanelContentImage;

export class ThreeSceneManager {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private interactionManager!: InteractionManager;
  private container: HTMLElement;
  private panels: Map<string, ThreeMeshUI.Block> = new Map();
  private toggleSwitch!: ToggleSwitch; // 添加ToggleSwitch实例

  private dataCollectionButton!: DataCollectionButton; // 添加DataCollectionButton实例

  // 添加防抖定时器映射
  private debounceTimers: Map<string, number> = new Map();

  // 添加按钮状态轮询相关属性
  private buttonStatePollingTimer: number | null = null;
  private registeredButtons: Map<
    string,
    { button: InteractiveButton; stateUrl: string }
  > = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.initScene();
    this.setupEventListeners();
  }

  /**
   * 创建一个数据采集按钮
   */
  public createDataCollectionButton(
    position: THREE.Vector3
  ): DataCollectionButton {
    const dataCollectionButton = new DataCollectionButton(
      "数据采集",
      {
        initialValue: false,
        onColor: 0x4caf50, // 绿色
        offColor: 0xf44336, // 红色
      },
      (value: "on" | "off" | "pause") => {
        console.log("Data collection button value changed:", value);
        // 在这里处理开关状态变化的逻辑
      }
    );
    const switchObject = dataCollectionButton.getObject3D();
    switchObject.position.copy(position);
    this.scene.add(switchObject);
    this.interactionManager.addInteractiveObject(switchObject);
    return dataCollectionButton;
  }

  /**
   * 启动轮询请求以更新按钮状态
   */
  public startPolling(dataCollectionButton: DataCollectionButton) {
    const pollInterval = 5000; // 轮询间隔时间（毫秒）
    let isCollecting = false;
    let pollTimer: number | null = null;

    const fetchData = () => {
      // 这里模拟轮询请求，实际应用中应替换为真正的API请求
      pollTimer = window.setTimeout(() => {
        isCollecting = !isCollecting; // 切换状态
        dataCollectionButton.setValue(isCollecting);
        dataCollectionButton.updateStatusText(
          isCollecting ? "正在采集中" : "采集已关闭"
        );
        fetchData(); // 继续轮询
      }, pollInterval);
    };

    fetchData(); // 开始轮询

    // 返回清理函数
    return () => {
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }

  private initScene() {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x505050);

    // Initialize camera
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.xr.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Initialize interaction manager
    this.interactionManager = new InteractionManager(
      this.renderer,
      this.camera,
      this.scene
    );

    const vrButton = VRButton.createButton(this.renderer);
    this.container.appendChild(vrButton);

    // Initialize controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.set(0, 1.6, 0);
    this.controls.target = new THREE.Vector3(0, 1, -1.8);
    // this.controls.update();

    // Add room
    const room = new THREE.LineSegments(
      new BoxLineGeometry(6, 6, 6, 10, 10, 10).translate(0, 3, 0),
      new THREE.LineBasicMaterial({ color: 0x808080 })
    );
    this.scene.add(room);
    const cnt1 = this.renderer.xr.getController(0);
    const cnt2 = this.renderer.xr.getController(1);
    this.renderer.xr.addEventListener("sessionstart", () => {
      console.log("XR Session started");

      const cnt = this.interactionManager.getControllerCount();
      console.log(cnt, "数量");
      if (cnt < 2) {
        this.renderer.xr.getFrame().session.end();
      }
      this.makeTextPanel(
        { width: 2.0, height: 0.5 },
        new THREE.Vector3(0, 1, -1.8),
        [
          {
            type: "text",
            content: String(cnt1),
            fontSize: 0.06,
            fontColor: "#ffffff",
          },
          {
            type: "text",
            content: String(cnt2),
            fontSize: 0.05,
            fontColor: "#c4c4c4",
          },
          // {
          //   type: "image",
          //   texture: ThreeIcon,
          //   width: 0.5,
          //   height: 0.5,
          // },
        ],
        0.1,
        {
          key: "aaa",
          borderRadius: 0.2,
        }
      );
    });

    this.renderer.xr.addEventListener("sessionend", () => {
      console.log("👋 XR Session ended.");
    });

    // Add text panel
    this.makeTextPanel(
      { width: 2.0, height: 0.5 },
      new THREE.Vector3(0, 1, -1.8),
      [
        {
          type: "text",
          content: "aaa\n",
          fontSize: 0.06,
          fontColor: "#ffffff",
        },
        {
          type: "text",
          content: "bbb",
          fontSize: 0.05,
          fontColor: "#c4c4c4",
        },
        // {
        //   type: "image",
        //   texture: ThreeIcon,
        //   width: 0.5,
        //   height: 0.5,
        // },
      ],
      0.1,
      {
        key: "aaa",
        borderRadius: 0.2,
      }
    );
    // // 创建导航按钮
    const button1 = this.createCustomButton(
      new THREE.Vector3(0, 0.6, -1.2),
      debounce(() => {
        // TODO: 替换为你的 mesh 切换逻辑
        button1.updateButtonState(true);
      }, 500)
    );
    setInterval(() => {
      const isActive = Math.random() > 0.5; // 随机状态用于演示
      console.log("isActive1111111111111111:", isActive);
      // // 更新按钮状态
      button1.updateButtonState(isActive);
    }, 2000);

    // 创建一个简单的测试按钮
    // this.createSimpleButton(
    //   "测试按钮",
    //   new THREE.Vector3(-0.5, 1.2, -1.8),
    //   () => {
    //     console.log("测试按钮被点击了");
    //   }
    // );

    // 创建ToggleSwitch组件
    // this.toggleSwitch = this.createToggleSwitch(
    //   "Feature Toggle",
    //   new THREE.Vector3(-0.5, 0.8, -1.8),
    //   false,
    //   (value) => {
    //     console.log("Toggle value changed:", value);
    //     // 在这里处理开关状态变化的逻辑
    //   }
    // );

    // 创建一个用于演示轮询更新的按钮，支持状态文案变化
    const teleButton = this.createInteractiveButton(
      "Teleport",
      new THREE.Vector3(-0.5, 1.2, -1.8),
      () => {
        console.log("Teleport button clicked");
      },
      {
        activeText: "传送中...", // 激活状态显示的文案
        inactiveText: "传送", // 非激活状态显示的文案
      }
    );

    // 注册按钮以进行状态更新
    this.registerButtonForStateUpdates(
      "teleportButton",
      teleButton,
      "/api/isTeleon" // 示例URL
    );

    // 启动轮询（每3秒更新一次状态）
    // this.startButtonStatePolling(3000);

    // 创建数据采集按钮
    this.dataCollectionButton = this.createDataCollectionButton(
      new THREE.Vector3(0.5, 1.6, -1.8)
    );

    // 启动轮询请求
    this.startPolling(this.dataCollectionButton);

    // 创建包装的ToggleSwitch组件
    this.toggleSwitch = this.createCustomToggle(
      new THREE.Vector3(0.5, 1.5, -1.8),
      "Feature Control", // 顶部文字
      // "Toggle Status", // 底部文字
      "",
      false, // 初始值
      debounce((value) => {
        console.log("Toggle value changed:", value);
        this.toggleSwitch.updateFromServer(-2);
        // 在这里处理开关状态变化的逻辑
      }, 300)
    );
    this.toggleSwitch.updateFromServer(2);
    // 演示动态更新ToggleSwitch状态和文案（临时注释掉避免卡死）
    const states = [-2, -1, 0, 1, 2];
    setInterval(() => {
      const randomState = states[Math.floor(Math.random() * states.length)];
      console.log("Updating toggle state:", randomState);
      this.toggleSwitch.updateFromServer(randomState);
    }, 2000);

    // Start animation loop
    this.renderer.setAnimationLoop(this.loop.bind(this));
  }

  private createButton() {
    const container = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.2,
      justifyContent: "center",
      contentDirection: "row-reverse",
      fontFamily: FontJSON,
      fontTexture: FontImage,
      fontSize: 0.07,
      padding: 0.02,
      borderRadius: 0.11,
    });
    container.position.set(0, 0.6, -1.2);
    this.scene.add(container);
    const buttonOptions = {
      width: 0.4,
      height: 0.15,
      justifyContent: "center",
      offset: 0.05,
      margin: 0.02,
      borderRadius: 0.075,
    };

    // 状态属性
    const hoveredStateAttributes = {
      backgroundColor: new THREE.Color(0x999999),
      backgroundOpacity: 1,
      fontColor: new THREE.Color(0xffffff),
    };
    const idleStateAttributes = {
      backgroundColor: new THREE.Color(0x666666),
      backgroundOpacity: 0.3,
      fontColor: new THREE.Color(0xffffff),
    };
    const selectedAttributes = {
      backgroundColor: new THREE.Color(0x777777),
      fontColor: new THREE.Color(0x222222),
    };

    // 创建按钮并实现 isUI/setState
    const makeInteractiveButton = (label: string, onClick: () => void) => {
      const btn = new ThreeMeshUI.Block(buttonOptions) as IInteractiveObject;
      btn.add(new ThreeMeshUI.Text({ content: label }));
      btn.isUI = true;
      btn.setState = (state: string) => {
        if (state === "hovered") {
          (btn as unknown as { set: (attrs: object) => void }).set(
            hoveredStateAttributes
          );
        } else if (state === "selected") {
          (btn as unknown as { set: (attrs: object) => void }).set(
            selectedAttributes
          );
          onClick();
        } else {
          (btn as unknown as { set: (attrs: object) => void }).set(
            idleStateAttributes
          );
        }
      };
      this.interactionManager.addInteractiveObject(btn);
      return btn;
    };

    // 你可以根据实际 ThreeSceneManager 结构调整 currentMesh/showMesh
    // 这里只做演示，实际用法请传递合适的回调
    const buttonNext = makeInteractiveButton("next", () => {
      // TODO: 替换为你的 mesh 切换逻辑
      console.log("Next button clicked");
    });
    const buttonPrevious = makeInteractiveButton("previous", () => {
      // TODO: 替换为你的 mesh 切换逻辑
      console.log("Previous button clicked");
    });

    container.add(buttonNext, buttonPrevious);
  }

  /**
   * 创建一个交互式按钮
   * @param label 按钮的标签文本
   * @param position 按钮在场景中的位置
   * @param callback 按钮点击时的回调函数
   * @param options 按钮配置选项，包括状态文案
   * @returns InteractiveButton实例
   */
  public createInteractiveButton(
    label: string,
    position: THREE.Vector3,
    callback?: () => void,
    options?: { activeText?: string; inactiveText?: string; [key: string]: any }
  ): InteractiveButton {
    const button = new InteractiveButton(label, options || {}, callback);
    const buttonObject = button.getObject3D();
    buttonObject.position.copy(position);
    this.scene.add(buttonObject);
    this.interactionManager.addInteractiveObject(buttonObject);
    return button;
  }

  /**
   * 创建一对导航按钮（上一个/下一个）
   * @param position 按钮组在场景中的位置
   * @param onNextClick 点击"next"按钮时的回调函数
   * @param onPreviousClick 点击"previous"按钮时的回调函数
   */
  // public createNavigationButtons(
  //   position: THREE.Vector3,
  //   onNextClick?: () => void,
  //   onPreviousClick?: () => void
  // ) {
  //   // 创建容器
  //   const container = new ThreeMeshUI.Block({
  //     width: 0.5,
  //     height: 0.5,
  //     content: "111",
  //     justifyContent: "center",
  //     contentDirection: "row-reverse",
  //     fontFamily: FontJSON,
  //     fontTexture: FontImage,
  //     fontSize: 0.07,
  //     padding: 0.02,
  //     borderRadius: 0.11,
  //   });
  //   container.position.copy(position);
  //   this.scene.add(container);

  //   // 创建"next"按钮
  //   const nextButton = this.createInteractiveButton(
  //     "next",
  //     new THREE.Vector3(),
  //     onNextClick
  //   );
  //   const nextButtonObject = nextButton.getObject3D();

  //   // 创建"previous"按钮
  //   const previousButton = this.createInteractiveButton(
  //     "previous",
  //     new THREE.Vector3(),
  //     onPreviousClick
  //   );
  //   const previousButtonObject = previousButton.getObject3D();

  //   container.add(nextButtonObject);
  // }
  public createCustomButton(position: THREE.Vector3, onClick?: () => void) {
    // 创建主容器（垂直排列，space-between）
    const container = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.5,
      contentDirection: "column", // 垂直排列
      justifyContent: "center", // 垂直方向均匀分布
      alignItems: "center", // 水平方向居中
      fontFamily: FontJSON,
      fontTexture: FontImage,
      fontSize: 0.07,
      padding: 0.05,
      borderRadius: 0.1,
      backgroundColor: new THREE.Color(0x222222),
      backgroundOpacity: 0.8,
    });
    container.position.copy(position);
    this.scene.add(container);

    // 上方文字
    const topText = new ThreeMeshUI.Text({
      content: "Top Text",
      fontSize: 0.05,
      fontColor: new THREE.Color(0xffffff),
    });

    // 按钮容器（水平排列）
    const buttonContainer = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.2,
      contentDirection: "row", // 水平排列
      justifyContent: "center",
      alignItems: "center",
      padding: 0.02,
      backgroundOpacity: 0, // 透明
    });

    const Button = this.createInteractiveButton(
      "opening",
      new THREE.Vector3(),
      onClick
    );
    const topBox = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.1,
      justifyContent: "center",
      backgroundOpacity: 0, // 透明
    });

    const bottomBox = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.1,
      justifyContent: "center",
      backgroundOpacity: 0, // 透明
    });
    buttonContainer.add(Button.getObject3D());
    // 下方文字
    const bottomText = new ThreeMeshUI.Text({
      content: "Bottom Text",
      fontSize: 0.05,
      fontColor: new THREE.Color(0xcccccc),
    });
    topBox.add(topText);
    bottomBox.add(bottomText);
    container.add(topBox, buttonContainer, bottomBox);
    return Button;
  }

  /**
   * 创建一个包装的 ToggleSwitch 组件（包含顶部和底部文字）
   * @param position 组件在场景中的位置
   * @param topText 顶部显示的文字
   * @param bottomText 底部显示的文字
   * @param initialValue 开关的初始值
   * @param callback 状态改变时的回调函数
   * @returns ToggleSwitch实例
   */
  public createCustomToggle(
    position: THREE.Vector3,
    topText: string = "Toggle Switch",
    bottomText: string = "Switch Status",
    initialValue: boolean = false,
    callback?: (value: boolean) => void
  ): ToggleSwitch {
    // 创建主容器（垂直排列）
    const container = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.5,
      contentDirection: "column", // 垂直排列
      justifyContent: "center", // 垂直方向均匀分布
      alignItems: "center", // 水平方向居中
      fontFamily: FontJSON,
      fontTexture: FontImage,
      fontSize: 0.07,
      padding: 0.05,
      borderRadius: 0.1,
      backgroundColor: new THREE.Color(0x222222),
      backgroundOpacity: 0.8,
    });
    container.position.copy(position);
    this.scene.add(container);

    // 上方文字
    const topTextElement = new ThreeMeshUI.Text({
      content: topText,
      fontSize: 0.05,
      fontColor: new THREE.Color(0xffffff),
    });

    // 开关容器
    const toggleContainer = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.2,
      contentDirection: "row", // 水平排列
      justifyContent: "center",
      alignItems: "center",
      padding: 0.02,
      backgroundOpacity: 0, // 透明
    });

    // 创建ToggleSwitch
    const toggle = this.createToggleSwitch(
      "Toggle", // 内部标签
      new THREE.Vector3(),
      initialValue,
      callback
    );

    const topBox = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.1,
      justifyContent: "center",
      backgroundOpacity: 0, // 透明
    });

    const bottomBox = new ThreeMeshUI.Block({
      width: 0.5,
      height: 0.1,
      justifyContent: "center",
      backgroundOpacity: 0, // 透明
    });

    toggleContainer.add(toggle.getObject3D());

    // 下方文字
    const bottomTextElement = new ThreeMeshUI.Text({
      content: bottomText,
      fontSize: 0.05,
      fontColor: new THREE.Color(0xcccccc),
    });

    topBox.add(topTextElement);
    bottomBox.add(bottomTextElement);
    container.add(topBox, toggleContainer, bottomBox);

    return toggle;
  }

  /**
   * 创建一个简单按钮
   * @param label 按钮的标签文本
   * @param position 按钮在场景中的位置
   * @param callback 按钮点击时的回调函数
   * @returns SimpleButton实例
   */
  public createSimpleButton(
    label: string,
    position: THREE.Vector3,
    callback?: () => void
  ): SimpleButton {
    const button = new SimpleButton(label, {}, callback);
    const buttonObject = button.getObject3D();
    buttonObject.position.copy(position);
    this.scene.add(buttonObject);
    this.interactionManager.addInteractiveObject(buttonObject);
    return button;
  }

  /**
   * 创建一个ToggleSwitch组件
   * @param label 开关的标签文本
   * @param position 开关在场景中的位置
   * @param initialValue 初始值（默认为false）
   * @param callback 值改变时的回调函数
   * @returns ToggleSwitch实例
   */
  public createToggleSwitch(
    label: string,
    position: THREE.Vector3,
    initialValue: boolean = false,
    callback?: (value: boolean) => void
  ): ToggleSwitch {
    const toggleSwitch = new ToggleSwitch(label, { initialValue }, callback);
    const switchObject = toggleSwitch.getObject3D();
    switchObject.position.copy(position);
    this.scene.add(switchObject);
    this.interactionManager.addInteractiveObject(switchObject);
    return toggleSwitch;
  }

  private makeTextPanel(
    size: { width: number; height: number },
    position: THREE.Vector3,
    contentList: PanelContent[],
    padding: number = 0,
    options?: PanelOptions
  ) {
    const key = options?.key || `panel-${Date.now()}`;
    // 主容器
    const container = new ThreeMeshUI.Block({
      width: size.width,
      height: size.height,
      padding: padding,
      justifyContent: "start", // 改为起始对齐
      textAlign: "left",
      fontFamily: FontJSON,
      fontTexture: FontImage,
      fontSize: options?.fontSize ?? 0.05, // 使用传入的字体大小，默认为0.05
      borderRadius: options?.borderRadius ?? 0,
      contentDirection: "row", // 关键：设置为行排列
    });

    container.position.copy(position);
    this.scene.add(container);
    this.panels.set(key, container); // 正确使用Map的set方法

    const loader = new THREE.TextureLoader();

    // 只创建一个居中的容器来放置所有文本
    // 创建左右两个子容器
    const leftColumn = new ThreeMeshUI.Block({
      width: size.width * (options?.aspectRatio ?? 0.7), // 左侧占70%宽度
      height: size.height,
      justifyContent: "center",
      textAlign: "center",
      contentDirection: "column", // 垂直排列
      borderRadius: 0,
      backgroundColor: new THREE.Color(0x000000), // 设置为黑色
      backgroundOpacity: 0, // 0 表示完全透明
    });

    const rightColumn = new ThreeMeshUI.Block({
      width: size.width * (1 - (options?.aspectRatio ?? 0.7)), // 右侧占30%宽度
      height: size.height,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 0,
      backgroundColor: new THREE.Color(0x000000), // 设置为黑色
      backgroundOpacity: 0, // 0 表示完全透明
    });

    container.add(leftColumn, rightColumn);

    // 分离文本和图片内容
    const texts = contentList.filter((item) => item.type === "text");
    const images = contentList.filter((item) => item.type === "image");

    // 创建内容容器（用于设置interLine）
    const contentContainer = new ThreeMeshUI.Block({
      width: size.width * (options?.aspectRatio ?? 0.7),
      height: size.height,
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      contentDirection: "column",
      interLine: 0.8, // 在这里设置interLine
      borderRadius: 0,
      backgroundColor: new THREE.Color(0x000000),
      backgroundOpacity: 0,
    });

    leftColumn.add(contentContainer);

    // 添加文本到内容容器
    texts.forEach((item) => {
      if (item.type === "text") {
        contentContainer.add(
          new ThreeMeshUI.Text({
            content: item.content,
            fontSize: item.fontSize ?? options?.fontSize ?? 0.05, // 支持单项字体大小设置
            lineHeight:
              item.lineHeight ?? item.fontSize ?? options?.fontSize ?? 0.05, // 行高
            fontColor: item.fontColor
              ? new THREE.Color(item.fontColor)
              : undefined,
          })
        );
      }
    });

    // 添加图片到右列
    images.forEach((item) => {
      if (item.type === "image") {
        loader.load(item.texture, (texture) => {
          rightColumn.add(
            new ThreeMeshUI.InlineBlock({
              height: item.height ?? 0.3,
              width: item.width ?? 0.3,
              backgroundTexture: texture,
              backgroundColor: item.backgroundColor
                ? new THREE.Color(item.backgroundColor)
                : undefined,
              backgroundOpacity: item.backgroundOpacity,
              borderRadius: item.borderRadius ?? 0,
            })
          );
        });
      }
    });

    return key; // 返回面板key
  }

  public updatePanelText(key: string, newTextContent: PanelContent[]): boolean {
    const panel = this.panels.get(key);
    if (!panel) {
      console.warn(`Panel with key "${key}" not found`);
      return false;
    }

    // 清除面板中的所有子元素
    while (panel.children.length > 0) {
      panel.remove(panel.children[0]);
    }

    // 使用默认配置创建左右两个子容器
    const size = { width: 2.0, height: 0.5 };
    const currentOptions = {
      aspectRatio: 0.7,
    };

    // 使用原始配置创建左右两个子容器
    const leftColumn = new ThreeMeshUI.Block({
      width: size.width * (currentOptions?.aspectRatio ?? 0.7), // 左侧占原始比例宽度
      height: size.height,
      justifyContent: "center",
      textAlign: "center",
      contentDirection: "column", // 垂直排列
      borderRadius: 0,
      backgroundColor: new THREE.Color(0x000000), // 设置为黑色
      backgroundOpacity: 0, // 0 表示完全透明
    });

    const rightColumn = new ThreeMeshUI.Block({
      width: size.width * (1 - (currentOptions?.aspectRatio ?? 0.7)), // 右侧占30%宽度
      height: size.height,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 0,
      backgroundColor: new THREE.Color(0x000000), // 设置为黑色
      backgroundOpacity: 0, // 0 表示完全透明
    });

    panel.add(leftColumn, rightColumn);

    // 创建内容容器（用于设置interLine）
    const contentContainer = new ThreeMeshUI.Block({
      width: size.width * (currentOptions?.aspectRatio ?? 0.7),
      height: size.height,
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      contentDirection: "column",
      interLine: 0.05, // 默认行间距
      borderRadius: 0,
      backgroundColor: new THREE.Color(0x000000),
      backgroundOpacity: 0,
    });

    leftColumn.add(contentContainer);

    // 分离文本和图片内容
    const texts = newTextContent.filter((item) => item.type === "text");
    const images = newTextContent.filter((item) => item.type === "image");

    const loader = new THREE.TextureLoader();

    // 添加文本到内容容器
    texts.forEach((item) => {
      if (item.type === "text") {
        contentContainer.add(
          new ThreeMeshUI.Text({
            content: item.content,
            fontSize: item.fontSize, // 支持单项字体大小设置
            lineHeight: item.lineHeight ?? item.fontSize ?? 0.05, // 行高
            fontColor: item.fontColor
              ? new THREE.Color(item.fontColor)
              : undefined,
          })
        );
      }
    });

    // 添加图片到右列
    images.forEach((item) => {
      if (item.type === "image") {
        loader.load(item.texture, (texture) => {
          rightColumn.add(
            new ThreeMeshUI.InlineBlock({
              height: item.height ?? 0.3,
              width: item.width ?? 0.3,
              backgroundTexture: texture,
              backgroundColor: item.backgroundColor
                ? new THREE.Color(item.backgroundColor)
                : undefined,
              backgroundOpacity: item.backgroundOpacity,
              borderRadius: item.borderRadius ?? 0,
            })
          );
        });
      }
    });

    return true;
  }

  public removePanel(key: string): boolean {
    const panel = this.panels.get(key); // 使用Map的get方法获取
    if (panel) {
      this.scene.remove(panel);
      this.panels.delete(key); // 使用Map的delete方法移除
      return true;
    }
    return false;
  }

  // 获取面板（可选）
  public getPanel(key: string): ThreeMeshUI.Block | undefined {
    return this.panels.get(key);
  }

  private onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private setupEventListeners() {
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  private loop() {
    // 更新UI
    ThreeMeshUI.update();

    // 更新相机控制器
    this.controls.update();

    // 更新交互管理器
    this.interactionManager.update();
    this.toggleSwitch.update(10); // 或者你用的 1

    // 渲染场景
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 获取动画循环方法
   * 用于外部访问渲染器的动画循环
   */
  public getLoop() {
    return this.loop.bind(this);
  }

  public dispose() {
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    this.renderer.setAnimationLoop(null);
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }

    // 清理所有防抖定时器
    this.debounceTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.debounceTimers.clear();

    // 停止按钮状态轮询
    this.stopButtonStatePolling();

    // Add any additional cleanup here
  }

  /**
   * 防抖工具方法
   * @param func 需要防抖的函数
   * @param delay 延迟时间（毫秒）
   * @param key 函数的唯一标识符
   * @returns 防抖后的函数
   */
  private debounce(
    func: () => void,
    delay: number,
    key: string = "default"
  ): () => void {
    return () => {
      // 清除现有的定时器
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 设置新的定时器
      const newTimer = window.setTimeout(() => {
        func();
        this.debounceTimers.delete(key);
      }, delay);

      // 保存定时器引用
      this.debounceTimers.set(key, newTimer);
    };
  }

  /**
   * 启动按钮状态轮询
   * @param pollInterval 轮询间隔（毫秒）
   */
  public startButtonStatePolling(pollInterval: number = 5000): void {
    // 如果已有轮询在运行，先清除它
    if (this.buttonStatePollingTimer) {
      clearInterval(this.buttonStatePollingTimer);
    }

    console.log("Starting button state polling");

    // 启动新的轮询
    this.buttonStatePollingTimer = window.setInterval(async () => {
      console.log("Polling button states...");
      // 遍历所有注册的按钮
      for (const [key, buttonInfo] of this.registeredButtons) {
        try {
          // 模拟调用isTeleon接口获取状态
          // 在实际应用中，这里应该是真实的API调用
          // const response = await fetch(buttonInfo.stateUrl);
          // const data = await response.json();
          // 模拟状态变化
          const isActive = Math.random() > 0.5; // 随机状态用于演示

          console.log(`Button ${key} is ${isActive ? "active" : "inactive"}`);

          // 更新按钮状态
          buttonInfo.button.updateButtonState(isActive);
        } catch (error) {
          console.error(`Failed to fetch state for button ${key}:`, error);
        }
      }
    }, pollInterval);
  }

  /**
   * 停止按钮状态轮询
   */
  public stopButtonStatePolling(): void {
    if (this.buttonStatePollingTimer) {
      clearInterval(this.buttonStatePollingTimer);
      this.buttonStatePollingTimer = null;
    }
  }

  /**
   * 注册按钮以进行状态更新
   * @param key 按钮的唯一标识符
   * @param button InteractiveButton实例
   * @param stateUrl 状态接口URL
   */
  public registerButtonForStateUpdates(
    key: string,
    button: InteractiveButton,
    stateUrl: string
  ): void {
    this.registeredButtons.set(key, { button, stateUrl });
  }

  /**
   * 取消注册按钮的状态更新
   * @param key 按钮的唯一标识符
   * @returns 是否成功取消注册
   */
  public unregisterButtonForStateUpdates(key: string): boolean {
    return this.registeredButtons.delete(key);
  }
}
