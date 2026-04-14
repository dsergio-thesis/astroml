async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) {
        throw new Error(`Failed to load ${path}`);
    }
    return await res.json();
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

async function loadOverview() {
    const overview = document.getElementById("overview");
    if (!overview) return;

    const eda = await loadJSON("data/eda.json");

    overview.innerHTML = `
    <p><strong>Dataset length:</strong> ${eda.dataset_length}</p>
    <p><strong>Exported samples:</strong> ${eda.num_exported_samples}</p>
  `;
}

async function loadEDA() {
    const eda = await loadJSON("data/eda.json");

    const summary = document.getElementById("eda-summary");
    if (summary) {
        const labelItems = Object.entries(eda.label_counts)
            .map(([label, count]) => `<li><strong>${label}</strong>: ${count}</li>`)
            .join("");

        summary.innerHTML = `
      <p><strong>Dataset size:</strong> ${eda.dataset_length} (${eda.num_exported_samples} sampled)</p>
      <h3>Label counts</h3>
      <ul>${labelItems}</ul>
    `;
    }

    const classCounts = document.getElementById("plot-class-counts");
    if (classCounts) classCounts.src = eda.plots.class_counts;

    const widthHeight = document.getElementById("plot-width-height");
    if (widthHeight) widthHeight.src = eda.plots.width_height;
}

async function loadGallery() {
    const samples = await loadJSON("data/samples.json");
    const grid = document.getElementById("gallery-grid");
    const labelFilter = document.getElementById("label-filter");
    const metaSearch = document.getElementById("meta-search");

    if (!grid || !labelFilter || !metaSearch) return;

    const ITEMS_PER_PAGE = 5;
    let currentPage = 1;

    const labels = [...new Set(samples.map(s => s.label))].sort();
    for (const label of labels) {
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        labelFilter.appendChild(option);
    }

    let pagination = document.getElementById("gallery-pagination");
    if (!pagination) {
        pagination = el("div", "gallery-pagination");
        pagination.id = "gallery-pagination";
        grid.parentNode.appendChild(pagination);
    }

    function getFilteredSamples() {
        const selectedLabel = labelFilter.value.trim();
        const search = metaSearch.value.trim().toLowerCase();

        return samples.filter(sample => {
            const labelOk = !selectedLabel || sample.label === selectedLabel;
            const metaText = JSON.stringify(sample.meta).toLowerCase();
            const searchOk = !search || metaText.includes(search);
            return labelOk && searchOk;
        });
    }

    function renderPagination(totalItems) {
        const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
        currentPage = Math.min(currentPage, totalPages);

        pagination.innerHTML = "";

        const prevBtn = el("button", "page-btn", "Previous");
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener("click", () => {
            currentPage--;
            render();
        });

        const pageInfo = el("span", "page-info", `Page ${currentPage} of ${totalPages}`);

        const nextBtn = el("button", "page-btn", "Next");
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener("click", () => {
            currentPage++;
            render();
        });

        pagination.appendChild(prevBtn);
        pagination.appendChild(pageInfo);
        pagination.appendChild(nextBtn);
    }

    function render() {
        const filtered = getFilteredSamples();

        const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageSamples = filtered.slice(start, end);

        grid.innerHTML = "";

        for (const sample of pageSamples) {
            const item = el("div", "gallery-item");

            const link = document.createElement("a");
            link.href = `sample.html?id=${sample.id}`;
            link.className = "sample-link";

            const bandRow = el("div", "band-row");

            const fullSampleId = String(sample.id).padStart(5, "0");
            const bands = 6;

            for (let i = 0; i < bands; i++) {
                const bandImg = document.createElement("img");
                bandImg.src = `assets/samples/sample_${fullSampleId}/sample_${fullSampleId}_band${i}.png`;
                bandImg.loading = "lazy";
                bandImg.alt = `Sample ${sample.id} - Band ${i + 1}`;
                bandImg.className = "band-img";
                bandRow.appendChild(bandImg);
            }

            link.appendChild(bandRow);

            const meta = el("div", "meta");
            meta.innerHTML = `
                <div><strong>Dataset index:</strong> ${sample.dataset_index}</div>
                <div><strong>Label:</strong> ${sample.label}</div>
            `;

            item.appendChild(link);
            item.appendChild(meta);
            grid.appendChild(item);
        }

        renderPagination(filtered.length);
    }

    function resetAndRender() {
        currentPage = 1;
        render();
    }

    labelFilter.addEventListener("change", resetAndRender);
    metaSearch.addEventListener("input", resetAndRender);

    render();
}
async function loadSamplePage() {
    const view = document.getElementById("sample-view");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    if (!view || !prevBtn || !nextBtn) return;

    const samples = await loadJSON("data/samples.json");
    const params = new URLSearchParams(window.location.search);
    const requestedId = Number(params.get("id") || 0);

    let currentIndex = samples.findIndex(s => s.id === requestedId);
    if (currentIndex < 0) currentIndex = 0;

    function render() {
        const sample = samples[currentIndex];
        view.innerHTML = `
      <img class="sample-image" src="${sample.image_path}" alt="Sample ${sample.id}">
      <p><strong>ID:</strong> ${sample.id}</p>
      <p><strong>Dataset index:</strong> ${sample.dataset_index}</p>
      <p><strong>Label:</strong> ${sample.label}</p>
      <p><strong>Size:</strong> ${sample.width} × ${sample.height}</p>
      <h3>Metadata</h3>
      <pre class="meta-block">${JSON.stringify(sample.meta, null, 2)}</pre>
    `;

        const url = new URL(window.location.href);
        url.searchParams.set("id", sample.id);
        window.history.replaceState({}, "", url);
    }

    prevBtn.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + samples.length) % samples.length;
        render();
    });

    nextBtn.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % samples.length;
        render();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") prevBtn.click();
        if (event.key === "ArrowRight") nextBtn.click();
    });

    render();
}
