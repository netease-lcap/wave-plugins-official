#!/usr/bin/env python3
"""
生成功能规格说明文档的脚本
支持跨平台运行（Windows、Linux、macOS）
"""

import os
import sys
import json
import re
import argparse
from pathlib import Path


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


def generate_feature_name(description, stop_words=None):
    """生成功能名称，过滤停用词"""
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
                       help='提供自定义的简短名称（2-4 个词）作为功能名')
    
    args = parser.parse_args()
    
    if not args.description:
        print("错误: 必须提供功能描述", file=sys.stderr)
        sys.exit(1)
    
    # 确定仓库根目录：永远指向当前工作目录
    repo_root = Path.cwd()
    script_dir = Path(__file__).parent.resolve()
    
    # 创建 specs 目录
    specs_dir = repo_root / "specs"
    specs_dir.mkdir(exist_ok=True)
    
    # 获取下一个编号
    highest = get_highest_spec_number(specs_dir)
    next_num = highest + 1
    feature_num = f"{next_num:03d}"
    
    # 生成功能名称
    if args.short_name:
        feature_suffix = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '-', 
                              args.short_name.lower()).strip('-')
        feature_suffix = re.sub(r'-+', '-', feature_suffix)
    else:
        feature_suffix = generate_feature_name(args.description)
    
    feature_name = f"{feature_num}-{feature_suffix}"
    
    # 创建功能目录和子目录
    feature_dir = specs_dir / feature_name
    feature_dir.mkdir(exist_ok=True)
    
    # 创建 checklists 子目录
    checklists_dir = feature_dir / "checklists"
    checklists_dir.mkdir(exist_ok=True)
    
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
    
    # 输出结果
    if args.json:
        result = {
            'FEATURE_NAME': feature_name,
            'SPEC_FILE': str(spec_file),
            'FEATURE_NUM': feature_num
        }
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(f"FEATURE_NAME: {feature_name}")
        print(f"SPEC_FILE: {spec_file}")
        print(f"FEATURE_NUM: {feature_num}")


if __name__ == '__main__':
    main()
