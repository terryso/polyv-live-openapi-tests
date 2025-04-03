import { World, IWorldOptions, setWorldConstructor, BeforeStep } from '@cucumber/cucumber';
import { client } from '../api/urls';
import { validateEnv } from './env';

// 定义类型别名
type PactumResponse = any;
type PactumSpec = ReturnType<typeof client.spec>;

export interface CustomWorld extends World {
  context: {
    useFormData?: boolean;
    jsonData?: Record<string, any>;
    formData?: Record<string, any>;
    queryParams?: Record<string, any>;
    routeParams?: Record<string, any>;
    isFileUpload?: boolean;
    formDataBuffer?: Buffer;
    formDataBoundary?: string;
    loggedIn?: boolean;
    [key: string]: any;
  };
  sessionId: string;
  stepResponses: Map<number, PactumResponse>;
  currentStepNumber: number;
  error: Error | null;
  currentSpec: PactumSpec | null;  // 新增: 当前正在构建的请求规范
  
  // 步骤计数方法
  getCurrentStepNumber(): number;
  
  // 响应数据管理
  setStepResponse(stepNumber: number, response: PactumResponse): void;
  getStepResponse(stepNumber: number): PactumResponse | undefined;
  getValueFromStepResponse(stepNumber: number, path: string): any;
  getLastResponse(): PactumResponse | undefined; // 获取最后一个响应
  
  // Spec 管理
  createNewSpec(): PactumSpec;
  getCurrentSpec(): PactumSpec;  // 新增: 获取当前规范
  clearAllData(): void;
}

export class ApiWorld extends World implements CustomWorld {
  context: { 
    useFormData?: boolean; 
    jsonData?: Record<string, any>;
    formData?: Record<string, any>;
    queryParams?: Record<string, any>;
    routeParams?: Record<string, any>;
    isFileUpload?: boolean;
    formDataBuffer?: Buffer;
    formDataBoundary?: string;
    loggedIn: boolean;
    [key: string]: any; 
  };
  sessionId: string;
  stepResponses: Map<number, PactumResponse>;
  currentStepNumber: number;
  error: Error | null;
  currentSpec: PactumSpec | null;  // 新增属性

  constructor(options: IWorldOptions) {
    super(options);
    
    // 验证环境变量
    validateEnv();
    
    // 从上一个世界获取登录状态
    const prevWorld = options.parameters.world as unknown as ApiWorld;
    const loggedIn = prevWorld?.context?.loggedIn;
    
    this.context = { 
      useFormData: false, 
      queryParams: {},
      formData: {},
      jsonData: {},
      routeParams: {},
      isFileUpload: false,
      loggedIn: loggedIn || false 
    };
    
    this.sessionId = '';
    this.currentSpec = null;
    this.stepResponses = new Map();
    this.currentStepNumber = 0;
    this.error = null;
  }

  getCurrentStepNumber(): number {
    return this.currentStepNumber;
  }

  setStepResponse(stepNumber: number, response: PactumResponse): void {
    this.stepResponses.set(stepNumber, response);
  }

  getStepResponse(stepNumber: number): PactumResponse | undefined {
    return this.stepResponses.get(stepNumber);
  }

  getValueFromStepResponse(stepNumber: number, path: string): any {
    const response = this.getStepResponse(stepNumber);
    if (!response || !response.json) {
      return undefined;
    }
    return path.split('.').reduce((obj, key) => obj && obj[key], response.json);
  }

  // 获取最后一个响应
  getLastResponse(): PactumResponse | undefined {
    // 获取所有响应步骤编号
    const responseSteps = Array.from(this.stepResponses.keys());
    if (responseSteps.length === 0) {
      return undefined;
    }
    
    // 按照步骤编号排序，获取最大的编号
    const lastStepNumber = Math.max(...responseSteps);
    return this.getStepResponse(lastStepNumber);
  }

  createNewSpec(): PactumSpec {
    const spec = client.spec();
    return spec;
  }

  // 获取当前规范，如果不存在则创建新的
  getCurrentSpec(): PactumSpec {
    if (!this.currentSpec) {
      this.currentSpec = this.createNewSpec();
    }
    return this.currentSpec;
  }

  clearAllData(): void {
    // 保存会话相关信息
    const sessionId = this.sessionId;
    const loggedIn = this.context?.loggedIn;
    
    this.context = { 
      useFormData: false,
      queryParams: {},
      formData: {},
      jsonData: {},
      routeParams: {},
      isFileUpload: false,
      // 保留登录状态信息
      loggedIn: loggedIn || false
    };
    
    // 保留会话ID
    this.sessionId = sessionId;
    
    this.stepResponses = new Map();
    this.currentStepNumber = 0;
    this.error = null;
    this.currentSpec = null;  // 清除当前规范
  }
}

setWorldConstructor(ApiWorld);

// 在每个步骤执行前自动增加步骤计数
BeforeStep(function(this: CustomWorld) {
  this.currentStepNumber += 1;
  // console.log(`执行步骤 #${this.currentStepNumber}`);
}); 