async function loadGallery() {
  const grid = document.getElementById("gallery-grid");
  const search = document.getElementById("gallery-search");

  const base = (typeof SITE_BASEURL !== "undefined" && SITE_BASEURL) ? SITE_BASEURL : "";
  const res = await fetch(`${base}/data/samples.json`);
  const items = await res.json();

  function render(filter = "") {
    const q = filter.trim().toLowerCase();
    grid.innerHTML = "";

    items
      .filter(item =>
        !q ||
        String(item.id).toLowerCase().includes(q) ||
        String(item.label).toLowerCase().includes(q)
      )
      .forEach(item => {
        const card = document.createElement("article");
        card.className = "sample-card";
        const imgSrc = item.image_path
          ? base + "/" + item.image_path.replace(/^\//, "")
          : (item.thumb || item.image || "");
        card.innerHTML = `
          <img src="${imgSrc}" alt="${item.id}">
          <div class="sample-meta">
            <h3>${item.id}</h3>
            <p><strong>Label:</strong> ${item.label}</p>
          </div>
        `;
        grid.appendChild(card);
      });
  }

  search?.addEventListener("input", e => render(e.target.value));
  render();
}

loadGallery();
