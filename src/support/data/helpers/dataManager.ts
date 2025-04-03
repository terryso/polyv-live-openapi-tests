import path from 'path';
import fs from 'fs';

export class DataManager {
  private data: { [key: string]: any } = {};
  private fixturesPath: string;

  constructor() {
    this.fixturesPath = path.join(__dirname, '../fixtures');
    this.loadAllData();
  }

  /**
   * 保存测试数据
   * @param key 数据的唯一标识符
   * @param value 要保存的数据
   */
  public save(key: string, value: any): void {
    this.data[key] = value;
  }

  /**
   * 获取测试数据
   * @param key 数据的唯一标识符
   * @returns 存储的数据，如果不存在则返回undefined
   */
  public get(key: string): any {
    return this.data[key];
  }

  /**
   * 清理测试数据
   */
  public clearTestData(): void {
    this.data = {};
  }

  /**
   * 加载所有测试数据
   */
  private loadAllData(): void {
    if (fs.existsSync(this.fixturesPath)) {
      const files = fs.readdirSync(this.fixturesPath);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const data = JSON.parse(fs.readFileSync(path.join(this.fixturesPath, file), 'utf-8'));
          const key = file.replace('.json', '');
          this.data[key] = data;
        }
      });
    }
  }
} 