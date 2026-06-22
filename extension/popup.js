chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, ({ loggedIn, appUrl }) => {
  const dot = document.getElementById("dot");
  const statusText = document.getElementById("status-text");
  const desc = document.getElementById("desc");
  const cta = document.getElementById("cta");

  if (loggedIn) {
    dot.className = "dot on";
    statusText.textContent = "Connected";
    desc.textContent = "Open LinkedIn Jobs and click the Match Score badge to analyze any listing.";
    cta.href = `${appUrl}/dashboard`;
    cta.textContent = "Open Dashboard";
  } else {
    dot.className = "dot off";
    statusText.textContent = "Not logged in";
    desc.textContent = "Log in to JobMatch to see your resume match score on LinkedIn.";
    cta.href = `${appUrl}/login`;
    cta.textContent = "Log In →";
  }
});
