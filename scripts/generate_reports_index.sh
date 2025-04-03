#!/bin/bash
set -e

# 设置报告名称
if [ "${CI_COMMIT_REF_NAME}" = "master" ]; then
  REPORT_NAME="正式环境API测试报告"
elif [ "${CI_COMMIT_REF_NAME}" = "develop" ]; then
  REPORT_NAME="测试环境API测试报告"
else
  REPORT_NAME="${CI_COMMIT_REF_NAME} 分支报告"
fi

echo "=== 开始报告索引生成过程 ==="
echo "当前分支: ${CI_COMMIT_REF_NAME}"
echo "报告名称: ${REPORT_NAME}"

# 检查public目录是否存在（来自缓存）
if [ -d "public" ]; then
  echo "找到现有public目录，可能来自GitLab缓存"
  echo "目录内容:"
  ls -la public/
  
  # 确保目录存在
  mkdir -p public/${CI_COMMIT_REF_NAME}
  mkdir -p public/branch_data
else
  echo "未找到现有public目录，创建新目录"
  mkdir -p public/${CI_COMMIT_REF_NAME}
  mkdir -p public/branch_data
fi

# 清理旧的分支目录（如果存在），确保使用最新报告
if [ -d "public/${CI_COMMIT_REF_NAME}" ]; then
  echo "清理当前分支的旧报告目录: public/${CI_COMMIT_REF_NAME}"
  rm -rf public/${CI_COMMIT_REF_NAME}/*
else
  echo "创建当前分支的报告目录: public/${CI_COMMIT_REF_NAME}"
  mkdir -p public/${CI_COMMIT_REF_NAME}
fi

# 拷贝当前分支报告
echo "复制当前分支报告到public/${CI_COMMIT_REF_NAME}/"
cp -r src/reports/* public/${CI_COMMIT_REF_NAME}/ 2>/dev/null || echo "警告：没有测试报告可复制"

echo "检查测试报告目录内容:"
ls -la public/${CI_COMMIT_REF_NAME}/ 2>/dev/null || echo "警告：分支目录不存在或为空"

# 创建/更新当前分支的分支信息文件
echo "正在为 ${CI_COMMIT_REF_NAME} 分支创建信息文件..."
cat > public/branch_data/${CI_COMMIT_REF_NAME}.json << EOF
{
  "name": "${CI_COMMIT_REF_NAME}",
  "display_name": "${REPORT_NAME}",
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# 执行索引生成前先检查目录结构
echo "=== 目录结构检查 ==="
echo "public目录内容:"
ls -la public/
echo "branch_data目录内容:"
ls -la public/branch_data/

echo "=== 开始生成索引页面 ==="

# 创建临时文件
temp_file=$(mktemp)

# 查找所有分支数据文件并提取信息
echo "查找所有分支数据文件..."
if [ -d "public/branch_data" ]; then
  branch_files=$(find public/branch_data -name "*.json" 2>/dev/null)
  if [ -z "$branch_files" ]; then
    echo "警告：未找到任何分支数据文件"
  else
    echo "找到以下分支数据文件:"
    find public/branch_data -name "*.json" | sort
  fi
else
  echo "警告: branch_data目录不存在"
  mkdir -p public/branch_data
fi

find public/branch_data -name "*.json" 2>/dev/null | while read branch_file; do
  branch=$(basename "$branch_file" .json)
  display_name=$(grep '"display_name"' "$branch_file" | cut -d '"' -f 4)
  updated_at=$(grep '"updated_at"' "$branch_file" | cut -d '"' -f 4)
  
  echo "处理分支: $branch (显示名称: $display_name)"
  
  # 检查分支目录是否存在
  if [ -d "public/$branch" ]; then
    echo "找到目录: public/$branch"
    # 列出目录内容以便调试
    echo "目录内容:"
    ls -la "public/$branch/"
    
    # 寻找可能的报告文件
    report_file=""
    if [ -f "public/$branch/cucumber-report.html" ]; then
      report_file="cucumber-report.html"
      echo "找到报告文件: $report_file"
    elif [ -f "public/$branch/index.html" ]; then
      report_file="index.html"
      echo "找到报告文件: $report_file"
    else
      echo "未找到报告文件，检查是否有其他HTML文件"
      html_files=$(find "public/$branch" -name "*.html" | head -1)
      if [ ! -z "$html_files" ]; then
        report_file=$(basename "$html_files")
        echo "使用找到的HTML文件: $report_file"
      fi
    fi
    
    if [ ! -z "$report_file" ]; then
      entry="$updated_at|$branch|$display_name|$report_file"
      echo "$entry" >> "$temp_file"
      echo "已添加分支 $branch 的报告链接: $entry"
    else
      echo "警告：$branch 分支目录存在但未找到报告文件"
    fi
  else
    echo "警告：$branch 分支目录不存在"
    # 尝试创建目录并复制当前分支的报告，如果是当前分支
    if [ "$branch" = "${CI_COMMIT_REF_NAME}" ]; then
      echo "这是当前分支，尝试创建目录并复制报告..."
      mkdir -p "public/$branch"
      cp -r src/reports/* "public/$branch/" 2>/dev/null || echo "无法复制报告文件"
      
      # 再次检查是否有报告文件
      if [ -f "public/$branch/cucumber-report.html" ]; then
        report_file="cucumber-report.html"
        entry="$updated_at|$branch|$display_name|$report_file"
        echo "$entry" >> "$temp_file"
        echo "已添加分支 $branch 的报告链接: $entry"
      fi
    fi
  fi
done

# 确保当前分支一定会被添加到索引中
if ! grep -q "${CI_COMMIT_REF_NAME}" "$temp_file"; then
  echo "当前分支 ${CI_COMMIT_REF_NAME} 未在索引中找到，强制添加..."
  
  # 确保目录存在
  mkdir -p "public/${CI_COMMIT_REF_NAME}"
  
  # 再次复制报告
  cp -r src/reports/* "public/${CI_COMMIT_REF_NAME}/" 2>/dev/null || echo "无法复制报告文件"
  
  # 检查报告文件
  report_file=""
  if [ -f "public/${CI_COMMIT_REF_NAME}/cucumber-report.html" ]; then
    report_file="cucumber-report.html"
  elif [ -f "public/${CI_COMMIT_REF_NAME}/index.html" ]; then
    report_file="index.html"
  else
    html_files=$(find "public/${CI_COMMIT_REF_NAME}" -name "*.html" | head -1)
    if [ ! -z "$html_files" ]; then
      report_file=$(basename "$html_files")
    else
      # 如果没有找到任何HTML文件，创建一个简单的索引
      cat > "public/${CI_COMMIT_REF_NAME}/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${REPORT_NAME}</title>
</head>
<body>
  <h1>${REPORT_NAME}</h1>
  <p>构建时间: $(date -u)</p>
  <p>分支: ${CI_COMMIT_REF_NAME}</p>
</body>
</html>
EOF
      report_file="index.html"
    fi
  fi
  
  if [ ! -z "$report_file" ]; then
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "$now|${CI_COMMIT_REF_NAME}|${REPORT_NAME}|$report_file" >> "$temp_file"
    echo "已强制添加当前分支 ${CI_COMMIT_REF_NAME} 的报告链接"
  fi
fi

echo "=== 索引文件内容 ==="
cat "$temp_file"

# 创建HTML头部
cat > public/index.html << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>API测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .report-link { 
      display: block; 
      margin: 10px 0; 
      padding: 10px; 
      background: #f5f5f5; 
      border-radius: 4px;
      text-decoration: none;
      color: #333;
      position: relative;
    }
    .report-link:hover {
      background: #e5e5e5;
    }
    .timestamp {
      font-size: 12px;
      color: #666;
      margin-left: 10px;
    }
    h1 { color: #333; }
    .no-reports {
      color: #666;
      font-style: italic;
      margin: 20px 0;
    }
    .build-info {
      font-size: 12px;
      color: #666;
      margin-top: 30px;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <h1>API测试报告</h1>
EOF

# 按更新时间从新到旧排序并生成链接
if [ -s "$temp_file" ]; then
  sort -r "$temp_file" | while IFS="|" read -r date branch name report; do
    # 格式化日期
    formatted_date="$date"
    echo "<a class=\"report-link\" href=\"./$branch/$report\">$name<span class=\"timestamp\">更新于: $formatted_date</span></a>" >> public/index.html
  done
else
  echo "<p class=\"no-reports\">暂无测试报告</p>" >> public/index.html
fi

# 添加构建信息
cat >> public/index.html << EOF
  <div class="build-info">
    <p>生成时间: $(date -u)</p>
    <p>当前分支: ${CI_COMMIT_REF_NAME}</p>
    <p>提交ID: ${CI_COMMIT_SHA}</p>
    <p>备注: 使用GitLab缓存保存多个分支报告</p>
  </div>
EOF

# 添加HTML尾部
cat >> public/index.html << EOF
</body>
</html>
EOF

# 清理临时文件
rm -f "$temp_file"

echo "=== 索引页面生成完成 ==="

# 为每个分支目录创建index.html重定向
echo "为分支目录创建重定向..."
for branch_dir in $(find public -mindepth 1 -maxdepth 1 -type d -not -name "branch_data" | sed 's|^public/||'); do
  if [ ! -f "public/$branch_dir/index.html" ] && [ -f "public/$branch_dir/cucumber-report.html" ]; then
    echo "为 $branch_dir 创建重定向"
    cat > "public/$branch_dir/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;URL='./cucumber-report.html'" />
</head>
<body>
  <p>重定向到 <a href="./cucumber-report.html">测试报告</a>...</p>
</body>
</html>
EOF
  fi
done

echo "=== 生成过程完成 ===" 