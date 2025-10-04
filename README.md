# PacketMan - Professional API Testing Client

![PacketMan Logo](https://img.shields.io/badge/PacketMan-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

A powerful desktop application for testing HTTP API endpoints. Fast, reliable, and beautiful. Built with Electron for developers who demand excellence.

## 🚀 Features

- **Lightning Fast** - Native HTTP client with no overhead
- **Beautiful Interface** - Dark-themed, modern UI inspired by VS Code
- **Secure & Private** - All requests run locally, no cloud sync
- **Save Requests** - Save and organize your API requests
- **All HTTP Methods** - GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Custom Headers** - Add unlimited custom headers
- **Response Details** - View status codes, timing, size, and headers
- **JSON Formatting** - Automatic JSON response formatting

## 📦 Installation

### Windows
Download `PacketMan-Setup-1.0.0.exe` and run the installer.

### macOS
Download `PacketMan-1.0.0.dmg`, open it, and drag PacketMan to Applications.

### Linux
Download `PacketMan-1.0.0.AppImage`, make it executable, and run:
```bash
chmod +x PacketMan-1.0.0.AppImage
./PacketMan-1.0.0.AppImage
```

Or install the `.deb` package:
```bash
sudo dpkg -i packetman_1.0.0_amd64.deb
```

## 🛠️ Development

### Prerequisites
- Node.js 16 or higher
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/packetman.git
cd packetman

# Install dependencies
npm install

# Run in development mode
npm start
```

### Building

```bash
# Build for all platforms
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 🎯 Usage

1. **Enter URL** - Type or paste your API endpoint URL
2. **Select Method** - Choose HTTP method (GET, POST, etc.)
3. **Add Headers** - Click "Add Header" to include custom headers
4. **Add Body** - For POST/PUT/PATCH, add request body in the Body tab
5. **Send Request** - Click "Send" or press Ctrl/Cmd + Enter
6. **View Response** - See status, timing, and response data
7. **Save Request** - Click "Save" to store for later use

## 🔧 Tech Stack

- **Electron** - Cross-platform desktop framework
- **Node.js** - Native HTTP/HTTPS client
- **JavaScript** - Vanilla JS for performance
- **IPC** - Secure process communication

## 📝 Keyboard Shortcuts

- `Ctrl/Cmd + Enter` - Send request
- `Ctrl/Cmd + S` - Save request

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 👥 Authors

**Hostelhubb Developer Team**

## 🐛 Bug Reports

If you find a bug, please open an issue on GitHub with:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)

## 💬 Support

For support, email support@hostelhubb.com or open an issue on GitHub.

## 🌟 Acknowledgments

- Inspired by Postman and Insomnia
- Built with love for the developer community

---

**Built with ❤️ for developers worldwide**
