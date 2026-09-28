import Shot from './Shot';

export default function GuideEn() {
  return (
    <>
      <p>This guide explains step by step how to set up <strong>ETS2 Package Sync</strong> on the PC you export the packages from (<strong>Client</strong>) and on the PC that runs the dedicated server (<strong>Server</strong>).</p>
      <p>The app manages both <strong>Euro Truck Simulator 2</strong> (ETS2) and <strong>American Truck Simulator</strong> (ATS), also together on the same PC: each game has its own mode, repository and webhook. The steps are the same for both games; where something differs, it is pointed out.</p>
      <p>Once done, every time you export the packages from the game, the dedicated server updates and restarts by itself.</p>
      <pre><code>{`Client PC (you play)         GitHub                  Server PC (dedicated server)
export_server_packages  -->  repository  --webhook-->  downloads the files, stops ETS2,
the app pushes                                         replaces them, restarts ETS2`}</code></pre>
      <h2 id="contents">Contents</h2>
      <ol>
      <li><a href="#1-requirements">Requirements</a></li>
      <li><a href="#2-create-the-github-repository">Create the GitHub repository</a></li>
      <li><a href="#3-install-the-app">Install the app</a></li>
      <li><a href="#4-set-up-the-client">Set up the Client</a></li>
      <li><a href="#5-set-up-the-server">Set up the Server</a></li>
      <li><a href="#6-open-the-webhook-port">Open the webhook port</a></li>
      <li><a href="#7-create-the-webhook-on-github">Create the webhook on GitHub</a></li>
      <li><a href="#8-token-for-private-repositories">Token for private repositories</a></li>
      <li><a href="#9-full-test">Full test</a></li>
      <li><a href="#10-server-page">Server page: control, console and updates</a></li>
      <li><a href="#11-update-the-app">Update the app</a></li>
      <li><a href="#12-common-problems">Common problems</a></li>
      </ol>
      <hr />
      <h2 id="1-requirements">1. Requirements</h2>
      <table>
      <thead>
      <tr>
      <th>Where</th>
      <th>What</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Anywhere</td>
      <td>A GitHub account</td>
      </tr>
      <tr>
      <td>Client PC</td>
      <td>ETS2 installed, <a href="https://git-scm.com/download/win">Git for Windows</a></td>
      </tr>
      <tr>
      <td>Server PC</td>
      <td>A working ETS2 dedicated server (with its <code>server_config.sii</code> and the Steam <code>server_logon_token</code>), the possibility to open a port on the router</td>
      </tr>
      </tbody></table>
      <blockquote>
      <p>Before using the app, check that the dedicated server starts correctly on its own (double-click <code>eurotrucks2_server.exe</code> for ETS2 or <code>amtrucks_server.exe</code> for ATS). The app starts and stops it, but cannot fix a wrong game configuration.</p>
      </blockquote>
      <h2 id="2-create-the-github-repository">2. Create the GitHub repository</h2>
      <p>The repository is the &quot;meeting point&quot; of Client and Server: it contains only the two package files.</p>
      <ol>
      <li><p>On GitHub click <strong>+</strong> at the top right → <strong>New repository</strong>.</p>
      </li>
      <li><p><strong>Repository name</strong>: for example <code>ets2-server-packages</code> (for ATS a second repository, e.g. <code>ats-server-packages</code>).</p>
      </li>
      <li><p>Choose <strong>Private</strong> (recommended) or <em>Public</em>.</p>
      </li>
      <li><p>Tick <strong>Add a README file</strong>, so the repository is not empty and already has the <code>main</code> branch.</p>
      </li>
      <li><p>Click <strong>Create repository</strong>.</p>
      <Shot name="github-nuova-repo" alt="New repository on GitHub" />
      </li>
      <li><p>In the repository click <strong>Add file → Create new file</strong>, name it <code>.gitattributes</code> and paste:</p>
      <pre><code>{`server_packages.sii -text
server_packages.dat binary`}</code></pre>
      <p>then <strong>Commit changes</strong>. This keeps Git from changing the line endings of the package files.</p>
      <Shot name="github-gitattributes" alt="Creating the .gitattributes file" />
      </li>
      </ol>
      <p>Write down the address of the repository (e.g. <code>https://github.com/your-user/ets2-server-packages</code>) and the branch name (usually <strong><code>main</code></strong>): both the Client and the Server need them. If you use both games, repeat these steps for the ATS repository: each game needs its own repository (or at least a different branch).</p>
      <h2 id="3-install-the-app">3. Install the app</h2>
      <p>On <strong>both</strong> PCs:</p>
      <ol>
      <li>Run <code>ETS2PackageSync-Setup-&lt;version&gt;.exe</code>.</li>
      <li>If <em>&quot;Windows protected your PC&quot;</em> appears: <strong>More info</strong> → <strong>Run anyway</strong> (the installer is not digitally signed).</li>
      <li>Choose the folder and complete the installation. The app starts by itself.</li>
      </ol>
      <p>At the first start the <strong>Settings</strong> page opens, with the mode of every game still to choose:</p>
      <Shot name="primo-avvio" alt="First start: Settings page" />
      <blockquote>
      <p><strong>Already set up the app on another PC?</strong> There open <strong>Settings → Export</strong> and save the file; here open <strong>Settings → Import</strong> and choose that file. The form is filled in but not saved: check the paths (folders and executable may differ on this PC) and click <strong>Save settings</strong>.</p>
      <p>On export the app asks whether to include the webhook secret and the GitHub token: in the file they are <strong>in clear text</strong>, so include them only to move the configuration and do not share the file. Without secrets, the import keeps the ones already on this PC. Theme, language and <em>Start with Windows</em> are not copied.</p>
      </blockquote>
      <p>Closing the window does <strong>not</strong> quit the app: it stays in the notification area (tray), near the clock. Click the icon to open it again, right-click for the quick menu. The dot on the icon shows the status: green ok, blue operation in progress, red error, grey not configured. With two games in use, the menu has a submenu for each and the dot shows the worse status of the two.</p>
      <p>The language of the app is in <strong>Settings → General → Language</strong>: <strong>Automatic</strong> follows the language of Windows, <strong>English</strong> and <strong>Italiano</strong> set it. It applies right away, without saving.</p>
      <hr />
      <h2 id="4-set-up-the-client">4. Set up the Client</h2>
      <p>The Client is the PC you play on and export the packages from.</p>
      <h3 id="41-git-for-windows">4.1 Git for Windows</h3>
      <p>Install <a href="https://git-scm.com/download/win">Git for Windows</a> with the default options. The app uses it to push: you do not have to clone anything by hand and no token is needed, Git handles the credentials.</p>
      <p>If Git is missing, the <strong>Git not found</strong> popup appears when you choose the <strong>Client</strong> mode (and at every start): <strong>Download Git for Windows</strong> opens the download page; after the installation click <strong>Check again</strong> and the Client mode starts right away, without restarting the app.</p>
      <h3 id="42-mode">4.2 Mode</h3>
      <p>At the top left click the name of the game and choose <strong>Euro Truck Simulator 2</strong> or <strong>American Truck Simulator</strong>: Dashboard, Server and Settings always show the chosen game. Then in <strong>Settings</strong> choose <strong>Client</strong>. In <strong>General</strong> turn on <strong>Start with Windows</strong> if you want the app to start by itself when you sign in (it starts minimized in the tray).</p>
      <Shot name="client-modalita" alt="Client mode" />
      <h3 id="43-repository">4.3 Repository</h3>
      <p>In the <strong>GitHub repository</strong> card:</p>
      <table>
      <thead>
      <tr>
      <th>Field</th>
      <th>Value</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Repository URL</td>
      <td>the address of the repository, e.g. <code>https://github.com/your-user/ets2-server-packages</code></td>
      </tr>
      <tr>
      <td>Branch</td>
      <td><code>main</code> (or the branch of your repository)</td>
      </tr>
      <tr>
      <td>SII / DAT file in the repository</td>
      <td>keep <code>server_packages.sii</code> and <code>server_packages.dat</code></td>
      </tr>
      </tbody></table>
      <Shot name="repository" alt="GitHub repository card" />
      <blockquote>
      <p>The default branch is <code>master</code>: new GitHub repositories use <code>main</code>, so check it.</p>
      </blockquote>
      <h3 id="44-game-folder">4.4 Game folder</h3>
      <p>In the <strong>ETS2 client</strong> card, <strong>ETS2 documents folder</strong> is already filled in with <code>Documents\Euro Truck Simulator 2</code> (for ATS <code>Documents\American Truck Simulator</code>): it is the folder where the game writes the exported files (the one with <code>profiles</code>, <code>config.cfg</code>, <code>game.log.txt</code>). Change it only if the game uses another folder.</p>
      <p>In <em>Advanced options</em> you can change the commit message and how many seconds to wait after the last change of the files before pushing.</p>
      <Shot name="client-impostazioni" alt="Client card" />
      <h3 id="45-save">4.5 Save</h3>
      <p>Click <strong>Save settings</strong> at the bottom right. The Dashboard shows the status <strong>Watching - waiting for export_server_packages</strong>: this is normal, the app is ready and waits for the first export.</p>
      <Shot name="client-dashboard" alt="Client Dashboard" />
      <p>The <em>How files flow</em> card sums up the path of the files: game folder → temporary clone (deleted after every push) → GitHub.</p>
      <h3 id="46-first-push">4.6 First push</h3>
      <ol>
      <li>Start ETS2, open the console (<code>~</code> key, if you enabled it) and type <code>export_server_packages</code>.</li>
      <li>After a few seconds the app clones the repository, copies the files and pushes them.</li>
      <li><strong>Only the first time</strong> the GitHub sign-in window opens (Git Credential Manager): sign in with the account that has write access to the repository. The credentials stay saved in Windows.</li>
      <li>On GitHub, <code>server_packages.sii</code> and <code>server_packages.dat</code> appear in the repository.</li>
      </ol>
      <p>The <strong>Push Now</strong> button checks again right away, <strong>Open Repository</strong> opens the repository in the browser.</p>
      <hr />
      <h2 id="5-set-up-the-server">5. Set up the Server</h2>
      <p>The Server is the PC that runs the ETS2 dedicated server.</p>
      <h3 id="51-mode-and-repository">5.1 Mode and repository</h3>
      <p>Choose the game at the top left, then <strong>Server</strong> in <strong>Settings</strong>. In <strong>General</strong>, if you want, turn on <strong>Start with Windows</strong> (recommended on an always-on server).</p>
      <Shot name="server-modalita" alt="Server mode" />
      <p>Fill in the <strong>GitHub repository</strong> card with <strong>the same values as the Client</strong> (URL and branch).</p>
      <h3 id="52-dedicated-server">5.2 Dedicated server</h3>
      <p>In the <strong>ETS2 dedicated server</strong> (or <strong>ATS dedicated server</strong>) card:</p>
      <table>
      <thead>
      <tr>
      <th>Field</th>
      <th>Value</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>ETS2 / ATS server executable</td>
      <td><code>eurotrucks2_server.exe</code> (ATS: <code>amtrucks_server.exe</code>), usually in <code>...\bin\win_x64\</code> of the server folder</td>
      </tr>
      <tr>
      <td>server_packages.sii used by the server</td>
      <td>the <code>server_packages.sii</code> file the server reads, usually in <code>Documents\Euro Truck Simulator 2</code> (or <code>American Truck Simulator</code>) of the user who starts the server</td>
      </tr>
      <tr>
      <td>server_packages.dat used by the server</td>
      <td>the same for the <code>.dat</code></td>
      </tr>
      </tbody></table>
      <p>Use <strong>Browse</strong> to pick them without typos in the path.</p>
      <Shot name="server-ets2" alt="ETS2 dedicated server card" />
      <p><em>Advanced options</em> (they can usually be left empty/default):</p>
      <table>
      <thead>
      <tr>
      <th>Field</th>
      <th>What it is for</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Working directory</td>
      <td>folder the server is started from. Empty = folder of the executable</td>
      </tr>
      <tr>
      <td>Command line arguments</td>
      <td>extra arguments for the server executable</td>
      </tr>
      <tr>
      <td>Backup folder</td>
      <td>where the previous files are saved before every update. Empty = <code>backups</code> next to the <code>.sii</code></td>
      </tr>
      <tr>
      <td>Backups to keep</td>
      <td>how many backups to keep</td>
      </tr>
      <tr>
      <td>Stop timeout</td>
      <td>seconds to wait for ETS2 to close</td>
      </tr>
      <tr>
      <td>Startup check</td>
      <td>ETS2 must stay up at least this many seconds after starting, otherwise the update is rolled back to the previous files. 0 = off</td>
      </tr>
      <tr>
      <td>Server log file</td>
      <td>the log shown in <strong>Server → Console</strong>. Empty = <code>server.log.txt</code> next to the <code>.sii</code></td>
      </tr>
      </tbody></table>
      <h3 id="53-webhook">5.3 Webhook</h3>
      <p>In the <strong>GitHub webhook</strong> card:</p>
      <ol>
      <li><strong>Port</strong>: keep the proposed one, <code>8787</code> for ETS2 and <code>8788</code> for ATS (each server needs its own port; change it only if something else already uses it).</li>
      <li><strong>Webhook secret</strong>: click <strong>Generate</strong>. Then click the eye icon and copy the value: you need it on GitHub (section 7).</li>
      <li><strong>GitHub token</strong>: only if the repository is <strong>private</strong> (see section 8).</li>
      <li><strong>Payload URL</strong>: click <strong>Detect public IP</strong> to get the full address to paste on GitHub, then <strong>Copy</strong>.</li>
      </ol>
      <Shot name="server-webhook" alt="GitHub webhook card" />
      <h3 id="54-save">5.4 Save</h3>
      <p>Click <strong>Save settings</strong>. The Dashboard shows the status of the server, the installed commit and the Payload URL of the webhook. To see the other game, choose it in the menu at the top left.</p>
      <Shot name="server-dashboard" alt="Server Dashboard" />
      <ul>
      <li><strong>Update Now</strong>: downloads the latest commit from GitHub and installs it right away (also useful to test the configuration).</li>
      <li>the <strong>ETS2 server</strong> (or <strong>ATS server</strong>) tile opens the <strong>Server</strong> page, where you start, stop and restart the dedicated server (section 10).</li>
      </ul>
      <h3 id="55-ets2-and-ats-together">5.5 ETS2 and ATS on the same PC</h3>
      <p>To manage both servers from the same PC, set up one game first, then choose the other one in the menu at the top left and repeat steps 5.1-5.4. The differences:</p>
      <table>
      <thead>
      <tr>
      <th></th>
      <th>ETS2</th>
      <th>ATS</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Server executable</td>
      <td><code>eurotrucks2_server.exe</code></td>
      <td><code>amtrucks_server.exe</code></td>
      </tr>
      <tr>
      <td>Documents folder</td>
      <td><code>Euro Truck Simulator 2</code></td>
      <td><code>American Truck Simulator</code></td>
      </tr>
      <tr>
      <td>Webhook port</td>
      <td><code>8787</code></td>
      <td><code>8788</code></td>
      </tr>
      <tr>
      <td>Steam App ID for the <code>server_logon_token</code></td>
      <td><code>227300</code></td>
      <td><code>270880</code></td>
      </tr>
      </tbody></table>
      <p>Each game uses its own repository, webhook secret and webhook on GitHub. In the <strong>Logs</strong> page the lines start with <code>[ETS2]</code> or <code>[ATS]</code>; the notifications show the name of the game.</p>
      <h3 id="56-server-updates-steamcmd">5.6 Updates of the dedicated server (SteamCMD)</h3>
      <p>When SCS releases a game update, the dedicated server must be updated too. The Server PC does it by itself with <strong>SteamCMD</strong>, without the Steam client and without an account: the dedicated servers of ETS2 and ATS are downloaded anonymously.</p>
      <ul>
      <li>The first time, the app downloads SteamCMD into its data folder (about 150 MB, about a minute).</li>
      <li>Every 2 hours (<strong>Check Steam every</strong>) it compares the installed build with the latest one on Steam.</li>
      <li>When there is a new build and <strong>Update the server automatically</strong> is on, it stops the server, updates it and starts it again. When it is off you only get a notification.</li>
      </ul>
      <p>The options are in <strong>Server → Updates</strong>, <strong>Server updates (SteamCMD)</strong> card: the switch applies right away, hours and folder with <strong>Save</strong>, without restarting the server. <strong>Server folder</strong> is where SteamCMD installs the files: empty = the folder that contains <code>bin\win_x64</code> of the executable, which is usually right.</p>
      <p>In <strong>Server → Updates</strong> the <strong>Dedicated server (Steam)</strong> card shows the installed build and the latest one on Steam, with the <strong>Check</strong> and <strong>Update server</strong> buttons. During the update it shows the step (preparing, download with its size, verifying, installing).</p>
      <blockquote>
      <p>When the server was installed with the Steam client or copied by hand, the installed build can be <em>Unknown</em>: click <strong>Update server</strong> once and from then on the updates are automatic. <strong>Update server</strong> can also install the server from scratch: first set the path of the executable where you want it installed.</p>
      </blockquote>
      <hr />
      <h2 id="6-open-the-webhook-port">6. Open the webhook port</h2>
      <p>GitHub must reach the Server PC from the internet on the webhook port: 8787 for ETS2, 8788 for ATS.</p>
      <ol>
      <li><p><strong>Windows Firewall</strong>: open the <em>Command Prompt</em> <strong>as administrator</strong> and run:</p>
      <pre><code>{`netsh advfirewall firewall add rule name="ETS2 Package Webhook" dir=in action=allow protocol=TCP localport=8787,8788`}</code></pre>
      <p>The rule opens the ports of both games; with one game its port is enough.</p>
      </li>
      <li><p><strong>Router</strong>: in the configuration page of the router create a <em>port forwarding</em> (sometimes called &quot;virtual server&quot; or &quot;NAT&quot;):
      external port <strong>8787</strong> TCP → LAN IP of the Server PC (shown under the Payload URL in the app, e.g. <code>192.168.1.50</code>), internal port <strong>8787</strong>. For ATS add the same rule with port <strong>8788</strong>.</p>
      </li>
      <li><p><strong>Check</strong>: from another device <strong>outside your network</strong> (e.g. a smartphone on mobile data) open <code>http://PUBLIC_IP:8787/health</code> (ATS: <code>:8788/health</code>). It must show <code>OK</code>.</p>
      </li>
      </ol>
      <blockquote>
      <p>If your public IP changes often, use a dynamic DNS service (e.g. DuckDNS, No-IP) and put the name instead of the IP in the Payload URL.</p>
      </blockquote>
      <h2 id="7-create-the-webhook-on-github">7. Create the webhook on GitHub</h2>
      <p>Each game has its own repository, so its own webhook: with ETS2 and ATS repeat these steps in the repository of each game, with the Payload URL and the secret of that game.</p>
      <ol>
      <li><p>In the repository on GitHub go to <strong>Settings → Webhooks → Add webhook</strong>.</p>
      </li>
      <li><p>Fill in:</p>
      <table>
      <thead>
      <tr>
      <th>Field</th>
      <th>Value</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Payload URL</td>
      <td>the one copied from the app, e.g. <code>http://PUBLIC_IP:8787/github-webhook</code> (ATS: port <code>8788</code>)</td>
      </tr>
      <tr>
      <td>Content type</td>
      <td><strong><code>application/json</code></strong> (do not leave <code>application/x-www-form-urlencoded</code>)</td>
      </tr>
      <tr>
      <td>Secret</td>
      <td>the same <strong>Webhook secret</strong> generated in the app</td>
      </tr>
      <tr>
      <td>SSL verification</td>
      <td>not relevant: the address is <code>http://</code></td>
      </tr>
      <tr>
      <td>Which events would you like to trigger this webhook?</td>
      <td><strong>Just the push event</strong></td>
      </tr>
      <tr>
      <td>Active</td>
      <td>ticked</td>
      </tr>
      </tbody></table>
      <Shot name="github-webhook" alt="Filled-in Add webhook form" />
      </li>
      <li><p>Click <strong>Add webhook</strong>.</p>
      </li>
      <li><p>Open the webhook again → <strong>Recent Deliveries</strong> tab: there must be a <code>ping</code> event with response <strong>200</strong> and text <code>pong</code>.</p>
      </li>
      </ol>
      <Shot name="github-webhook-consegne" alt="Recent Deliveries of the webhook" />
      <p>The green tick means a successful delivery, the red triangle a failed one: click it and open the <strong>Response</strong> tab to see what the app answered. With <strong>Redeliver</strong> you can send it again after fixing the problem.</p>
      <table>
      <thead>
      <tr>
      <th>Response in Recent Deliveries</th>
      <th>Meaning</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>200 <code>pong</code></td>
      <td>all good</td>
      </tr>
      <tr>
      <td>401 <code>invalid signature</code></td>
      <td>the secret on GitHub differs from the one in the app, or the Content type is not <code>application/json</code></td>
      </tr>
      <tr>
      <td>404</td>
      <td>the Payload URL does not end with <code>/github-webhook</code></td>
      </tr>
      <tr>
      <td>timeout / <em>couldn&#39;t connect</em></td>
      <td>the port is not reachable: firewall or port forwarding (section 6)</td>
      </tr>
      </tbody></table>
      <h2 id="8-token-for-private-repositories">8. Token for private repositories</h2>
      <p>Needed <strong>only on the Server</strong> and <strong>only if the repository is private</strong>. The Client does not need it.</p>
      <ol>
      <li><p>On GitHub: avatar at the top right → <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</strong> (direct link: <a href="https://github.com/settings/personal-access-tokens/new">https://github.com/settings/personal-access-tokens/new</a>).</p>
      </li>
      <li><p>Fill in:</p>
      <table>
      <thead>
      <tr>
      <th>Field</th>
      <th>Value</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Token name</td>
      <td>e.g. <code>ets2-package-sync</code></td>
      </tr>
      <tr>
      <td>Expiration</td>
      <td>your choice. When it expires, generate a new token and enter it again in the app</td>
      </tr>
      <tr>
      <td>Resource owner</td>
      <td>the account (or organization) that owns the repository</td>
      </tr>
      <tr>
      <td>Repository access</td>
      <td><strong>Only select repositories</strong> → the packages repository</td>
      </tr>
      <tr>
      <td>Permissions → Repository permissions → <strong>Contents</strong></td>
      <td><strong>Read-only</strong></td>
      </tr>
      </tbody></table>
      <p><em>Metadata: Read-only</em> is added automatically. Everything else stays <em>No access</em>.</p>
      <p>For the permissions click <strong>Add permissions</strong>, search <strong>Contents</strong> and keep <strong>Access: Read-only</strong>. With <em>Only select repositories</em> click <strong>Select repositories</strong> and choose the packages repository.</p>
      <Shot name="github-token" alt="New fine-grained token" />
      </li>
      <li><p><strong>Generate token</strong>, copy the value (<code>github_pat_...</code>, it is shown only once) and paste it in the app in <strong>GitHub token</strong>, then <strong>Save settings</strong>.</p>
      </li>
      </ol>
      <blockquote>
      <p>With a wrong or expired token, or one without access to the repository, GitHub answers <strong>404</strong> (not 401).</p>
      </blockquote>
      <hr />
      <h2 id="9-full-test">9. Full test</h2>
      <ol>
      <li>On the <strong>Server</strong> click <strong>Update Now</strong>: the <strong>Logs</strong> must show <code>[ETS2] Manual update: latest commit on main is ...</code> and then the installation.</li>
      <li>On the <strong>Client</strong> run <code>export_server_packages</code> in ETS2 (or <strong>Push Now</strong> after changing something).</li>
      <li>On the <strong>Server</strong>, within a few seconds: the webhook arrives, the files are downloaded and verified, ETS2 is stopped, the old files go to the backup, the new ones are installed and ETS2 starts again.</li>
      </ol>
      <p>The <strong>Logs</strong> page of each PC shows everything that happens, with the <em>Warnings</em> and <em>Errors</em> filters and the <strong>Open log file</strong> button for the full history.</p>
      <Shot name="logs" alt="Logs page" />
      <p>If the files of the new commit are identical to the installed ones, ETS2 is <strong>not</strong> restarted.</p>
      <h2 id="10-server-page">10. Server page: control, console and updates</h2>
      <p>In Server mode only, the <strong>Server</strong> page gathers everything about the dedicated server of the game chosen at the top left (it appears only when that game is in Server mode):</p>
      <ul>
      <li>at the top the <strong>Start</strong>, <strong>Stop</strong> and <strong>Restart</strong> buttons (also in the tray menu) and three tiles: state of the server, installed build and latest build on Steam;</li>
      <li>in the sidebar <strong>Server</strong> opens like a dropdown: the <strong>Console</strong> sub-item shows the log of the dedicated server (<code>server.log.txt</code>) live;</li>
      <li>the <strong>Updates</strong> sub-item the updates of the server through SteamCMD (section 5.6). An orange dot on the item means a new build or an update in progress.</li>
      <li>the <strong>Configuration</strong> sub-item edits the <code>server_config.sii</code> of the server: name, description, welcome message, password, max players, Steam logon token, gameplay options (damage, traffic, name tags, speed limiter...), AI vehicles, ports and moderators. Moderators are shown with their Steam name and avatar and are added by pasting the Steam ID or the link of the profile (also <code>steamcommunity.com/id/name</code>): in the file the app always writes the Steam ID. Only the values change: comments and the other lines of the file stay as they are, and the previous version is saved in <code>server_config.sii.bak</code>. Changes apply at the next start of the server: <strong>Save and restart the server</strong> applies them right away. The file is the one next to <code>server_packages.sii</code> (path in the <em>Advanced options</em> of the server); when it does not exist, create it in the game with the <code>export_server_config</code> console command.</li>
      </ul>
      <p>In the <strong>Console</strong>:</p>
      <ul>
      <li><strong>Filter</strong> to search a word, <strong>Hide warnings</strong> to hide the warnings (e.g. the many <code>Missing default icon</code>), <strong>Follow</strong> to follow the new lines, <strong>Open file</strong> to open the log.</li>
      </ul>
      <p>Errors are red, warnings yellow, <code>[MP]</code> (multiplayer) lines light blue. The log is read again from the top at every start of the server.</p>
      <Shot name="server-console" alt="Server page, Console tab" />
      <p>If the server closes right after starting, the answer is almost always in the last lines of the Console.</p>
      <h2 id="11-update-the-app">11. Update the app</h2>
      <p>At the bottom left, above the theme switch, there is the <strong>version</strong> card. The app checks for new versions by itself at startup and every 6 hours, and shows a notification when it finds one.</p>
      <ol>
      <li>When <strong>Version X available</strong> appears, click <strong>Download</strong> (<strong>Notes</strong> shows what is new on GitHub).</li>
      <li>When the download is done click <strong>Restart to update</strong>: the app closes, updates and starts again by itself with the same settings.</li>
      </ol>
      <p>The button with the arrows checks right away. The same items are in the tray menu. If you do not restart, the downloaded update is installed the next time you quit the app (<strong>Exit</strong>).</p>
      <blockquote>
      <p>On the Server PC the update is not installed while a server is being updated. The dedicated server is not stopped: updating the app does not interrupt the game.</p>
      </blockquote>
      <p>The <strong>portable</strong> version (.zip) does not update by itself: <strong>Open release</strong> opens the page to download it from.</p>
      <h2 id="12-common-problems">12. Common problems</h2>
      <table>
      <thead>
      <tr>
      <th>Message</th>
      <th>Cause and solution</th>
      </tr>
      </thead>
      <tbody><tr>
      <td><code>GitHub API 404 on commits/master</code></td>
      <td>The branch in the settings is wrong (it often has to be <code>main</code>), or the repository is private and the token is missing / expired / does not include that repository. Also check the Repository URL</td>
      </tr>
      <tr>
      <td><code>ETS2 exited right after start</code></td>
      <td>The dedicated server closed by itself: see <strong>Server → Console</strong> for the reason</td>
      </tr>
      <tr>
      <td><code>Steam log on failed - code ...</code> (in <strong>Server → Console</strong>)</td>
      <td>Problem with the <code>server_logon_token</code> in <code>server_config.sii</code>: missing, wrong, expired or already used by another instance of the server. Generate a new one on <a href="https://steamcommunity.com/dev/managegameservers">https://steamcommunity.com/dev/managegameservers</a> with App ID <code>227300</code> for ETS2 or <code>270880</code> for ATS</td>
      </tr>
      <tr>
      <td>Webhook with response 401</td>
      <td>Different secret between GitHub and the app, or Content type not <code>application/json</code></td>
      </tr>
      <tr>
      <td>Webhook timing out</td>
      <td>Webhook port (8787 / 8788) not reachable: Windows Firewall or port forwarding of the router</td>
      </tr>
      <tr>
      <td><code>port 8787 is already in use</code></td>
      <td>Another program uses the port: change it in the app <strong>and</strong> in the Payload URL on GitHub</td>
      </tr>
      <tr>
      <td><code>The ETS2 and ATS servers cannot use the same webhook port</code></td>
      <td>Give each server its own port (8787 and 8788) and update the Payload URL on GitHub</td>
      </tr>
      <tr>
      <td><code>ETS2 and ATS use the same repository, branch and file names</code></td>
      <td>The two games would overwrite each other&#39;s files: use a different repository or branch for each</td>
      </tr>
      <tr>
      <td>The Client stays on <em>waiting for export_server_packages</em></td>
      <td>The game has not exported the files yet, or the <strong>documents folder</strong> of the game points to the wrong folder</td>
      </tr>
      <tr>
      <td>The push fails with an authentication error</td>
      <td>Sign in again in the Git Credential Manager window with an account that has write access to the repository</td>
      </tr>
      <tr>
      <td><strong>Start with Windows</strong> does not turn on</td>
      <td>It works only in the installed app. If the description says <em>Disabled in Windows</em>, enable the app again in <em>Task Manager → Startup apps</em></td>
      </tr>
      <tr>
      <td><code>Update with SteamCMD failed: ERROR! ... (Disk write failure)</code></td>
      <td>Not enough disk space or a server folder that cannot be written. The server starts again anyway with the previous files</td>
      </tr>
      <tr>
      <td><strong>Git not found</strong> popup even after installing Git</td>
      <td>The installation of Git did not finish or used an unusual folder: install Git for Windows again with the default options and click <strong>Check again</strong></td>
      </tr>
      <tr>
      <td><em>Save settings</em> or <em>Exit</em> do not respond</td>
      <td>An update is in progress (of the packages or of the server with SteamCMD): wait for it to finish</td>
      </tr>
      </tbody></table>
      <p>The files of the app (settings, log, server state) are in <code>%APPDATA%\ETS2 Package Sync\</code>. Webhook secret and token are stored encrypted and readable only by your Windows user.</p>
    </>
  );
}
