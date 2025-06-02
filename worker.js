export default {
  async fetch(request) {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const dns = url.searchParams.get("dns");
    const customName = url.searchParams.get("name") || "";
    
    // اگر درخواست مستقیم فایل بود
    if (url.pathname === "/generate") {
      if (!dns || !type || (type !== "doh" && type !== "dot")) {
        return new Response("Invalid parameters", { status: 400 });
      }
      const filename = `${type}_profile.mobileconfig`;
      const profile = generateMobileConfig(dns, type, customName);
      return new Response(profile, {
        headers: {
          "Content-Type": "application/x-apple-aspen-config",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // اگر درخواست لینک نصب مستقیم بود
    if (url.pathname === "/install") {
      if (!dns || !type || (type !== "doh" && type !== "dot")) {
        return renderInstallError();
      }
      const profile = generateMobileConfig(dns, type, customName);
      return new Response(profile, {
        headers: {
          "Content-Type": "application/x-apple-aspen-config",
        },
      });
    }
    
    // صفحه HTML
    return new Response(renderForm(), {
      headers: { "content-type": "text/html; charset=UTF-8" },
    });
  },
};

function generateMobileConfig(dns, type, customName = "") {
  const protocol = type === "doh" ? "HTTPS" : "TLS";
  const displayName = customName || `${type.toUpperCase()} DNS Profile`;
  const description = customName 
    ? `${customName} - Custom DNS Configuration` 
    : "Custom DNS Configuration";
  
  // اعتبارسنجی و تصحیح URL برای DoH
  let serverUrl = dns;
  if (type === "doh") {
    // اطمینان از اینکه URL با https شروع می‌شود
    if (!serverUrl.startsWith("https://")) {
      if (serverUrl.startsWith("http://")) {
        serverUrl = serverUrl.replace("http://", "https://");
      } else {
        serverUrl = "https://" + serverUrl;
      }
    }
  } else if (type === "dot") {
    // برای DoT فقط hostname/IP باید باشد، نه کامل URL
    serverUrl = serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
  
  const config = {
    payloadUUID: crypto.randomUUID(),
    contentUUID: crypto.randomUUID()
  };
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>DNSSettings</key>
      <dict>
        <key>DNSProtocol</key>
        <string>${protocol}</string>
        ${type === "doh" ? 
          `<key>ServerURL</key>
        <string>${serverUrl}</string>` :
          `<key>ServerName</key>
        <string>${serverUrl}</string>`
        }
      </dict>
      <key>PayloadDescription</key>
      <string>${description}</string>
      <key>PayloadDisplayName</key>
      <string>DNS - ${displayName}</string>
      <key>PayloadIdentifier</key>
      <string>com.dnsprofile.${type}.${Date.now()}</string>
      <key>PayloadType</key>
      <string>com.apple.dnsSettings.managed</string>
      <key>PayloadUUID</key>
      <string>${config.contentUUID}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>${description}</string>
  <key>PayloadDisplayName</key>
  <string>${displayName}</string>
  <key>PayloadIdentifier</key>
  <string>com.dnsprofile.main.${Date.now()}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${config.payloadUUID}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadScope</key>
  <string>User</string>
</dict>
</plist>`;
}

function renderInstallError() {
  return new Response(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>خطا در نصب پروفایل</title>
  <style>
    body { font-family: system-ui; padding: 20px; text-align: center; background: #f5f5f5; }
    .error { background: white; padding: 30px; border-radius: 10px; margin: 20px auto; max-width: 400px; }
    .error h1 { color: #e74c3c; margin-bottom: 10px; }
    .back-btn { 
      display: inline-block; 
      background: #007aff; 
      color: white; 
      padding: 10px 20px; 
      text-decoration: none; 
      border-radius: 5px; 
      margin-top: 20px; 
    }
  </style>
</head>
<body>
  <div class="error">
    <h1>خطا</h1>
    <p>پارامترهای ارسالی نامعتبر هستند</p>
    <a href="/" class="back-btn">بازگشت به صفحه اصلی</a>
  </div>
</body>
</html>`, {
    headers: { "content-type": "text/html; charset=UTF-8" },
    status: 400
  });
}

function renderForm() {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ساخت پروفایل DNS برای iOS</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0d1117;
      color: #f0f6fc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      line-height: 1.6;
    }
    
    .container {
      background: rgba(22, 27, 34, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(48, 54, 61, 0.5);
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3);
    }
    
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #007aff, #5856d6);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #f0f6fc;
      margin-bottom: 8px;
    }
    
    .subtitle {
      color: #8b949e;
      font-size: 16px;
      font-weight: 400;
    }
    
    .form-group {
      margin-bottom: 24px;
    }
    
    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #f0f6fc;
      margin-bottom: 8px;
    }
    
    .optional {
      color: #8b949e;
      font-weight: 400;
      font-size: 12px;
    }
    
    select, input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(33, 38, 45, 0.8);
      border: 1px solid rgba(48, 54, 61, 0.8);
      border-radius: 8px;
      color: #f0f6fc;
      font-size: 16px;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    
    select:focus, input:focus {
      outline: none;
      border-color: #007aff;
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }
    
    select:hover, input:hover {
      border-color: rgba(48, 54, 61, 1);
    }
    
    .protocol-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }
    
    .protocol-option {
      position: relative;
    }
    
    .protocol-option input[type="radio"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .protocol-label {
      display: block;
      padding: 16px;
      background: rgba(33, 38, 45, 0.6);
      border: 1px solid rgba(48, 54, 61, 0.5);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }
    
    .protocol-option input[type="radio"]:checked + .protocol-label {
      background: rgba(0, 122, 255, 0.1);
      border-color: #007aff;
      color: #007aff;
    }
    
    .protocol-label:hover {
      background: rgba(33, 38, 45, 0.8);
      border-color: rgba(48, 54, 61, 0.8);
    }
    
    .protocol-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .protocol-desc {
      font-size: 12px;
      color: #8b949e;
    }
    
    .button-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 24px;
    }
    
    button {
      padding: 14px 20px;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
    }
    
    .download-btn {
      background: linear-gradient(135deg, #007aff, #5856d6);
    }
    
    .install-btn {
      background: linear-gradient(135deg, #34c759, #32d74b);
    }
    
    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
    }
    
    .install-btn:hover {
      box-shadow: 0 8px 24px rgba(52, 199, 89, 0.3);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    .install-link {
      margin-top: 16px;
      padding: 16px;
      background: rgba(33, 38, 45, 0.5);
      border: 1px solid rgba(48, 54, 61, 0.5);
      border-radius: 8px;
      display: none;
    }
    
    .install-link.show {
      display: block;
    }
    
    .install-link h3 {
      color: #f0f6fc;
      margin-bottom: 8px;
      font-size: 16px;
    }
    
    .link-input {
      display: flex;
      gap: 8px;
    }
    
    .link-input input {
      flex: 1;
      font-size: 14px;
      padding: 10px 12px;
    }
    
    .copy-btn {
      padding: 10px 16px;
      background: #6c757d;
      font-size: 14px;
      white-space: nowrap;
    }
    
    .copy-btn:hover {
      background: #5a6268;
      box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
    }
    
    .footer {
      margin-top: 24px;
      text-align: center;
      color: #8b949e;
      font-size: 14px;
    }
    
    @media (max-width: 480px) {
      .container {
        padding: 24px;
        margin: 16px;
      }
      
      .protocol-options {
        grid-template-columns: 1fr;
      }
      
      .button-group {
        grid-template-columns: 1fr;
      }
      
      .link-input {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <h1>ساخت پروفایل DNS</h1>
      <div class="subtitle">برای دستگاه‌های iOS و macOS</div>
    </div>
    
    <form id="dnsForm">
      <div class="form-group">
        <label>نوع پروتکل:</label>
        <div class="protocol-options">
          <div class="protocol-option">
            <input type="radio" id="doh" name="type" value="doh" required>
            <label for="doh" class="protocol-label">
              <div class="protocol-title">DoH</div>
              <div class="protocol-desc">DNS over HTTPS</div>
            </label>
          </div>
          <div class="protocol-option">
            <input type="radio" id="dot" name="type" value="dot" required>
            <label for="dot" class="protocol-label">
              <div class="protocol-title">DoT</div>
              <div class="protocol-desc">DNS over TLS</div>
            </label>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="name">نام نمایشی <span class="optional">(اختیاری)</span>:</label>
        <input 
          type="text" 
          id="name"
          name="name" 
          placeholder="مثال: Cloudflare DNS" 
        />
      </div>
      
      <div class="form-group">
        <label for="dns">آدرس سرور DNS:</label>
        <input 
          type="text" 
          id="dns"
          name="dns" 
          placeholder="مثال: https://dns.cloudflare.com/dns-query" 
          required 
        />
      </div>
      
      <div class="button-group">
        <button type="button" onclick="downloadProfile()" class="download-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          دانلود پروفایل
        </button>
        
        <button type="button" onclick="generateInstallLink()" class="install-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H6.99c-2.76 0-5 2.24-5 5s2.24 5 5 5H11v-1.9H6.99c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9.01-6H13v1.9h4.01c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1H13V17h4.01c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
          </svg>
          لینک نصب
        </button>
      </div>
    </form>
    
    <div id="installLink" class="install-link">
      <h3>لینک نصب مستقیم:</h3>
      <div class="link-input">
        <input type="text" id="linkText" readonly />
        <button type="button" onclick="copyLink()" class="copy-btn">کپی</button>
      </div>
    </div>
    
    <div class="footer">
      پس از دانلود یا کلیک روی لینک، فایل را در دستگاه خود نصب کنید
    </div>
  </div>

  <script>
    function validateForm() {
      const form = document.getElementById('dnsForm');
      const formData = new FormData(form);
      
      if (!formData.get('type') || !formData.get('dns')) {
        alert('لطفاً تمام فیلدهای الزامی را پر کنید');
        return false;
      }
      
      return true;
    }
    
    function downloadProfile() {
      if (!validateForm()) return;
      
      const form = document.getElementById('dnsForm');
      const formData = new FormData(form);
      const params = new URLSearchParams(formData);
      
      window.location.href = '/generate?' + params.toString();
    }
    
    function generateInstallLink() {
      if (!validateForm()) return;
      
      const form = document.getElementById('dnsForm');
      const formData = new FormData(form);
      const params = new URLSearchParams(formData);
      
      const installUrl = window.location.origin + '/install?' + params.toString();
      
      document.getElementById('linkText').value = installUrl;
      document.getElementById('installLink').classList.add('show');
    }
    
    function copyLink() {
      const linkText = document.getElementById('linkText');
      linkText.select();
      linkText.setSelectionRange(0, 99999);
      
      try {
        document.execCommand('copy');
        
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'کپی شد!';
        copyBtn.style.background = '#28a745';
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.background = '#6c757d';
        }, 2000);
      } catch (err) {
        alert('خطا در کپی کردن لینک');
      }
    }
  </script>
</body>
</html>`;
}
