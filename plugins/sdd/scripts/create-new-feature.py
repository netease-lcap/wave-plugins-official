#!/usr/bin/env python3
"""
生成功能规格说明文档的脚本
支持跨平台运行（Windows、Linux、macOS）
"""

import os
import sys
import json
import re
import subprocess
import argparse
from pathlib import Path


def find_repo_root(start_dir):
    """通过搜索项目标记来查找仓库根目录"""
    current = Path(start_dir).resolve()
    while current != current.parent:
        if (current / ".git").exists() or (current / ".wave").exists():
            return current
        current = current.parent
    return None


def get_highest_spec_number(specs_dir):
    """获取 specs 目录中最高的编号"""
    if not specs_dir.exists():
        return 0
    
    highest = 0
    for item in specs_dir.iterdir():
        if item.is_dir():
            match = re.match(r'^(\d+)', item.name)
            if match:
                number = int(match.group(1))
                if number > highest:
                    highest = number
    return highest


def generate_branch_name(description, stop_words=None):
    """生成分支名称，过滤停用词"""
    if stop_words is None:
        stop_words = {
            '我', '一个', '这个', '那个', '在', '的', '了', '和', '与', 
            '从', '是', '有', '做', '将', '会', '应该', '可以', '能', 
            '可能', '必须', '需要', '想', '添加', '获取', '设置'
        }
    
    # 转换为小写并提取字母数字字符和中文
    clean_name = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', ' ', description.lower())
    
    # 分割成词并过滤
    words = clean_name.split()
    meaningful_words = []
    
    for word in words:
        if not word:
            continue
        # 保留不是停用词且长度 >= 2 的词
        if word not in stop_words and len(word) >= 2:
            meaningful_words.append(word)
    
    # 使用前 3-4 个有意义的词
    if meaningful_words:
        max_words = 4 if len(meaningful_words) == 4 else 3
        result = '-'.join(meaningful_words[:max_words])
        return result
    else:
        # 回退逻辑
        fallback = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '-', description.lower())
        fallback = re.sub(r'-+', '-', fallback).strip('-')
        parts = [p for p in fallback.split('-') if p]
        return '-'.join(parts[:3])


def check_git_available():
    """检查 git 是否可用"""
    try:
        subprocess.run(['git', '--version'], 
                      capture_output=True, 
                      check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def get_git_root():
    """获取 git 仓库根目录"""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--show-toplevel'],
            capture_output=True,
            text=True,
            check=True
        )
        return Path(result.stdout.strip())
    except subprocess.CalledProcessError:
        return None


def create_git_branch(branch_name):
    """创建并切换到新分支"""
    try:
        subprocess.run(
            ['git', 'checkout', '-b', branch_name],
            check=True,
            capture_output=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"警告: 无法创建 git 分支: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description='生成功能规格说明文档',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  %(prog)s "添加用户认证系统" --short-name "用户认证"
  %(prog)s "实现 OAuth2 集成接口" --json
        '''
    )
    parser.add_argument('description', 
                       help='功能描述')
    parser.add_argument('--json', 
                       action='store_true',
                       help='以 JSON 格式输出')
    parser.add_argument('--short-name',
                       help='提供自定义的简短名称（2-4 个词）作为分支名')
    
    args = parser.parse_args()
    
    if not args.description:
        print("错误: 必须提供功能描述", file=sys.stderr)
        sys.exit(1)
    
    # 确定仓库根目录
    script_dir = Path(__file__).parent.resolve()
    has_git = check_git_available()
    
    if has_git:
        repo_root = get_git_root()
        if not repo_root:
            repo_root = find_repo_root(script_dir)
    else:
        repo_root = find_repo_root(script_dir)
    
    if not repo_root:
        print("错误: 无法确定仓库根目录。请从仓库内运行此脚本。", file=sys.stderr)
        sys.exit(1)
    
    os.chdir(repo_root)
    
    # 创建 specs 目录
    specs_dir = repo_root / "specs"
    specs_dir.mkdir(exist_ok=True)
    
    # 获取下一个编号
    highest = get_highest_spec_number(specs_dir)
    next_num = highest + 1
    feature_num = f"{next_num:03d}"
    
    # 生成分支名称
    if args.short_name:
        branch_suffix = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '-', 
                              args.short_name.lower()).strip('-')
        branch_suffix = re.sub(r'-+', '-', branch_suffix)
    else:
        branch_suffix = generate_branch_name(args.description)
    
    branch_name = f"{feature_num}-{branch_suffix}"
    
    # GitHub 分支名称长度限制
    max_length = 244
    if len(branch_name.encode('utf-8')) > max_length:
        print(f"[sdd] 警告: 分支名称超过 GitHub 的 {max_length} 字节限制",
              file=sys.stderr)
        # 简单截断（可以改进）
        while len(branch_name.encode('utf-8')) > max_length:
            branch_suffix = branch_suffix[:-1]
            branch_name = f"{feature_num}-{branch_suffix}".rstrip('-')
        print(f"[sdd] 截断为: {branch_name}", file=sys.stderr)
    
    # 创建 git 分支
    if has_git and get_git_root():
        create_git_branch(branch_name)
    else:
        print(f"[sdd] 警告: 未检测到 Git 仓库; 跳过为 {branch_name} 创建分支",
              file=sys.stderr)
    
    # 创建功能目录
    feature_dir = specs_dir / branch_name
    feature_dir.mkdir(exist_ok=True)
    
    # 查找并复制模板
    plugin_dir = script_dir.parent
    template_paths = [
        plugin_dir / "templates" / "spec-template.md",
        repo_root / ".specify" / "templates" / "spec-template.md"
    ]
    
    spec_file = feature_dir / "spec.md"
    template_found = False
    
    for template_path in template_paths:
        if template_path.exists():
            spec_file.write_text(template_path.read_text(encoding='utf-8'), 
                               encoding='utf-8')
            template_found = True
            break
    
    if not template_found:
        spec_file.touch()
    
    # 设置环境变量
    os.environ['SPECIFY_FEATURE'] = branch_name
    
    # 输出结果
    if args.json:
        result = {
            'BRANCH_NAME': branch_name,
            'SPEC_FILE': str(spec_file),
            'FEATURE_NUM': feature_num
        }
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(f"BRANCH_NAME: {branch_name}")
        print(f"SPEC_FILE: {spec_file}")
        print(f"FEATURE_NUM: {feature_num}")
        print(f"SPECIFY_FEATURE 环境变量设置为: {branch_name}")


if __name__ == '__main__':
    main()
