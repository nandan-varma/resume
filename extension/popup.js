function msg(payload) {
  return new Promise((res) => chrome.runtime.sendMessage(payload, res));
}

function show(id) { document.getElementById(id).classList.remove("hidden"); }
function hide(id) { document.getElementById(id).classList.add("hidden"); }

async function init() {
  const { loggedIn, user, settings, appUrl } = await msg({ type: "GET_INIT" });

  document.getElementById("dashboard-btn").href = `${appUrl}/dashboard`;
  document.getElementById("login-btn").href = `${appUrl}/login`;

  hide("auth-loading");

  if (loggedIn && user) {
    const initials = (user.name ?? user.email ?? "?")
      .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    document.getElementById("avatar").textContent = initials;
    document.getElementById("user-name").textContent = user.name || "User";
    document.getElementById("user-email").textContent = user.email || "";
    show("auth-user");
    show("settings-section");
    show("dashboard-btn");
    show("signout-btn");
  } else {
    show("auth-anon");
    show("login-btn");
  }

  // Settings
  const autoAnalyze = document.getElementById("autoAnalyze");
  const autoSave = document.getElementById("autoSave");
  const modelId = document.getElementById("modelId");
  autoAnalyze.checked = settings?.autoAnalyze ?? false;
  autoSave.checked = settings?.autoSave ?? false;
  modelId.value = settings?.modelId ?? "gemini-2.5-flash-lite";

  const save = () =>
    msg({ type: "SET_SETTINGS", settings: { autoAnalyze: autoAnalyze.checked, autoSave: autoSave.checked, modelId: modelId.value } });
  autoAnalyze.addEventListener("change", save);
  autoSave.addEventListener("change", save);
  modelId.addEventListener("change", save);

  document.getElementById("signout-btn").addEventListener("click", async () => {
    await msg({ type: "SIGN_OUT" });
    window.close();
  });
}

init();
