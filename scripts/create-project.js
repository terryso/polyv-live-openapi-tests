#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取项目名称
const projectName = process.argv[2];

if (!projectName) {
  console.error('请提供项目名称');
  console.error('使用方法: npm create api-test-scaffold my-api-tests');
  process.exit(1);
}

// 创建项目目录
const projectPath = path.join(process.cwd(), projectName);
console.log(`创建项目目录: ${projectPath}`);

// 复制脚手架文件
function copyScaffold() {
  const scaffoldPath = path.join(__dirname, '..');
  
  // 创建基本目录结构
  const dirs = [
    'src/features',
    'src/steps',
    'src/support',
    'src/api',
    'docs',
    'scripts',
    '.cursor/rules/tasks'
  ];

  dirs.forEach(dir => {
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
  });

  // 复制基础文件
  const filesToCopy = [
    'package.json',
    'tsconfig.json',
    '.env.example',
    'README.md',
    '.cursor/rules/tasks/010-feature-generation.mdc',
    '.cursor/rules/tasks/020-steps-generation.mdc',
    '.cursor/rules/tasks/030-scene-generation.mdc',
    '.cursor/rules/bdd-rule.mdc',
    '.cursor/rules/cmd.mdc'
  ];

  filesToCopy.forEach(file => {
    const sourcePath = path.join(scaffoldPath, file);
    const targetPath = path.join(projectPath, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// 初始化项目
function initProject() {
  try {
    // 创建项目目录
    fs.mkdirSync(projectPath, { recursive: true });
    
    // 复制脚手架文件
    copyScaffold();
    
    // 初始化git
    process.chdir(projectPath);
    execSync('git init');
    
    console.log('✨ 项目创建成功！');
    console.log(`
下一步：
1. cd ${projectName}
2. npm install
3. cp .env.example .env
4. 编辑 .env 文件配置环境变量
5. npm test
    `);
  } catch (error) {
    console.error('创建项目失败:', error);
    process.exit(1);
  }
}

initProject(); 