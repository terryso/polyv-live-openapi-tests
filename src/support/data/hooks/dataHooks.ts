import { Before, After } from '@cucumber/cucumber';
import { DataManager } from '../helpers/dataManager';

const dataManager = new DataManager();

// 在每个场景之前清理数据
Before(function() {
  dataManager.clearTestData();
});

// 在每个场景之后清理数据
After(function() {
  dataManager.clearTestData();
}); 