# 部署指南 (VPS)

本主要介绍如何将“日文歌词转换器”部署到你的 Linux VPS 服务器上。

## 1. 准备工作

在开始之前，请确保你已经：
1.  拥有一台 VPS (Ubuntu/Debian/CentOS)。
2.  可以通过 SSH 连接到你的 VPS。
3.  在本地安装了 Node.js（用于构建项目）。

## 2. 本地构建项目

首先，我们需要在本地生成生产环境的代码包。

1.  打开终端（命令行），进入项目 `app` 目录。
2.  运行构建命令：
    ```bash
    npm run build
    ```
3.  构建完成后，你会发现 `app` 目录下多了一个 `dist` 文件夹。这个文件夹里包含了所有需要上传到服务器的文件。

## 3. 服务器配置 (以 Ubuntu 为例)

### 3.1 安装 Nginx

登录到你的 VPS，安装 Nginx Web 服务器：

```bash
sudo apt update
sudo apt install nginx -y
```

### 3.2 上传文件

你需要将本地 `dist` 文件夹里的**所有内容**上传到服务器。
假设我们要部署到 `/var/www/japanese-lyrics-converter` 目录。

1.  **在服务器上**创建目录：
    ```bash
    sudo mkdir -p /var/www/japanese-lyrics-converter
    ```

2.  **在本地**使用 SCP 或 FileZilla 上传文件。
    *   **SCP 命令行方式** (在本地 Git Bash 或终端运行):
        ```bash
        # 假设你的 VPS IP 是 1.2.3.4，用户名是 root
        scp -r dist/* root@1.2.3.4:/var/www/japanese-lyrics-converter/
        ```
    *   **FileZilla 方式**: 连接 VPS，将本地 `dist` 文件夹内的文件拖拽到服务器的 `/var/www/japanese-lyrics-converter/` 目录中。

### 3.3 配置 Nginx

我们将使用项目里提供的 `deployment/nginx.conf` 作为参考。

1.  **在服务器上**创建一个新的 Nginx 配置文件：
    ```bash
    sudo nano /etc/nginx/sites-available/lyrics-app
    ```

2.  将 `deployment/nginx.conf` 的内容复制进去。
    *   **注意**: 记得把 `server_name` 后面的 `your_domain_or_ip` 改成你自己的 VPS IP 地址或域名。

3.  保存并退出 (在 nano 中按 `Ctrl+O` 回车保存，然后 `Ctrl+X` 退出)。

4.  启用配置：
    ```bash
    sudo ln -s /etc/nginx/sites-available/lyrics-app /etc/nginx/sites-enabled/
    ```

5.  测试配置是否正确：
    ```bash
    sudo nginx -t
    ```
    如果显示 `syntax is ok` 和 `test is successful`，则说明配置无误。

6.  重启 Nginx 使配置生效：
    ```bash
    sudo systemctl reload nginx
    ```

## 4. 验证

现在，在浏览器中输入你的 VPS IP 地址或域名，应该就能看到应用了！

### 测试 OCR 功能
尝试上传一张图片进行 OCR 识别，确保反向代理 (`/baidu-api`) 工作正常。如果能正常识别，说明 Nginx 的代理配置成功。

---

## 常见问题

*   **访问出现 403 Forbidden**: 检查 `/var/www/japanese-lyrics-converter` 目录的权限，确保 Nginx 用户 (通常是 `www-data`) 可以读取。
    ```bash
    sudo chown -R www-data:www-data /var/www/japanese-lyrics-converter
    sudo chmod -R 755 /var/www/japanese-lyrics-converter
    ```
*   **刷新页面 404**: 确保 Nginx 配置里有 `try_files $uri $uri/ /index.html;` 这一行。
