#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'
import readline from 'readline'

/**
 * 执行 shell 命令的函数
 * @param {string} command - 要执行的 shell 命令
 * @param {Object} options - 执行命令的选项，默认为空对象
 * @returns {string} 命令执行的输出结果
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',  // 静默模式下不显示输出
      ...options,
    })
  } catch (error) {

    throw new Error(`命令执行失败: ${command}\n${error.message}`)
  }
}

/**
 * 向用户提问并获取输入的函数
 * @param {string} question - 要询问用户的问题
 * @returns {Promise<string>} 包含用户输入的 Promise 对象
 */
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * 准备发布新版本的异步函数
 */
async function prepareRelease() {
  // 从命令行参数中获取版本号
  const version = process.argv[2]

  // 检查版本号是否存在且格式是否正确
  if (!version || !version.match(/^v?\d+\.\d+\.\d+$/)) {
    console.error('❌ 用法: node scripts/prepare-release.js v1.0.0')
    console.error('   或: npm run prepare-release v1.0.0')
    process.exit(1)
  }

  // 去除版本号前面的 'v'
  const cleanVersion = version.replace('v', '')
  // 确保版本号以 'v' 开头
  const tagVersion = version.startsWith('v') ? version : `v${version}`

  console.log(`🚀 准备发布版本 ${tagVersion}...\n`)

  try {
    // 检查 git 状态
    console.log('🔍 检查 git 状态...')
    // 执行 git status 命令，静默模式下获取输出
    const gitStatus = exec('git status --porcelain', { silent: true })
    if (gitStatus.trim()) {
      // 如果有未提交的更改，输出错误信息并退出进程
      console.error(
        '❌ 工作目录不干净。请先提交或暂存变更。'
      )
      console.log('未提交的变更:')
      console.log(gitStatus)
      process.exit(1)
    }

    // 更新 package.json 文件
    console.log('\n📝 更新 package.json 版本')
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const oldPkgVersion = pkg.version
    pkg.version = cleanVersion
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
    console.log(`   ${oldPkgVersion} → ${cleanVersion}`)

    // 更新 Cargo.toml 文件
    console.log('📝 更新 Cargo.toml 版本')
    const cargoPath = 'src-tauri/Cargo.toml'
    const cargoToml = fs.readFileSync(cargoPath, 'utf8')
    const oldCargoVersion = cargoToml.match(/version = "([^"]*)"/)
    const updatedCargo = cargoToml.replace(
      /version = "[^"]*"/,
      `version = "${cleanVersion}"`
    )
    fs.writeFileSync(cargoPath, updatedCargo)
    console.log(
      `   ${oldCargoVersion ? oldCargoVersion[1] : 'unknown'} → ${cleanVersion}`
    )

    // 更新 tauri.conf.json 文件
    console.log('📝 更新 tauri.conf.json 版本')
    const tauriConfigPath = 'src-tauri/tauri.conf.json'
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'))
    const oldTauriVersion = tauriConfig.version
    tauriConfig.version = cleanVersion
    fs.writeFileSync(
      tauriConfigPath,
      JSON.stringify(tauriConfig, null, 2) + '\n'
    )
    console.log(`   ${oldTauriVersion} → ${cleanVersion}`)

    console.log(`\n🎉 成功准备发布版本 ${tagVersion}!`)
    console.log('\n📋 Git 命令:')
    console.log(`   git add .`)
    console.log(`   git commit -m "chore: release ${tagVersion}"`)
    console.log(`   git tag ${tagVersion}`)
    console.log(`   git push origin main --tags`)

    const answer = await askQuestion(
      '\n❓ 您想让我执行这些 git 命令吗？(y/N): '
    )

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n⚡ 正在执行 git 命令...')
      console.log('📝 添加变更...')
      exec('git add .')
      console.log('💾 创建提交...')
      exec(`git commit -m "chore: release ${tagVersion}"`)

      console.log('🏷️  创建标签...')
      exec(`git tag ${tagVersion}`)

      console.log('📤 推送至远程...')
      exec('git push origin main --tags')

    } else {
      console.log('\n📝 Git 命令已保存，可手动执行。')
      console.log("   准备好发布时再执行这些命令。")
    }
  } catch (error) {
    console.error('\n❌ 预发布准备失败:', error.message)
    process.exit(1)
  }
}
prepareRelease()
