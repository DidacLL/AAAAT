(() => {
  "use strict";
  const definitions = {
    "Community": "Work that brings people together through local programmes, shared spaces or community services.",
    "Hybrid": "A mix of on-site and remote work. Keep the actual arrangement in the opportunity’s information.",
    "Human-readable": "A posting that describes the work before describing its passion for describing the work.",
    "Remote": "Work can be done away from the employer’s office. Location and working-hour restrictions still matter.",
    "Writing": "Clear written communication is a substantial part of the role.",
    "Public-facing": "Regular work with visitors, customers or members of the public."
  };
  const preview = document.querySelector("[data-preview]");
  if (preview) {
    const search = preview.querySelector("input[type=search]");
    const covers = [...preview.querySelectorAll(".application-cover")];
    const count = preview.querySelector("#preview-count");
    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      let visible = 0;
      for (const cover of covers) {
        cover.hidden = !cover.textContent.toLocaleLowerCase().includes(query);
        if (!cover.hidden) visible++;
      }
      count.textContent = visible === 0 ? "No examples match. Try a company, role, location or Tag." : visible + " of 3 examples";
    });
    for (const toggle of preview.querySelectorAll(".cover-summary")) {
      toggle.addEventListener("click", () => {
        const cover = toggle.closest(".application-cover");
        const expanded = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(expanded));
        cover.classList.toggle("expanded", expanded);
        document.getElementById(toggle.getAttribute("aria-controls")).hidden = !expanded;
        toggle.querySelector(".cover-toggle").textContent = expanded ? "− Collapse cover" : "+ Expand cover";
      });
    }
    for (const tag of preview.querySelectorAll("[data-tag]")) {
      tag.addEventListener("click", () => {
        const name = tag.dataset.tag;
        for (const item of preview.querySelectorAll("[data-tag]")) item.setAttribute("aria-pressed", String(item.dataset.tag === name));
        preview.querySelector("#tag-name").textContent = name;
        preview.querySelector("#tag-definition").textContent = definitions[name];
      });
    }
  }
  const links = [...document.querySelectorAll("a[data-lightbox]")];
  if (links.length && typeof HTMLDialogElement !== "undefined") {
    const dialog = document.createElement("dialog");
    dialog.className = "image-dialog";
    dialog.setAttribute("aria-label", "Enlarged image");
    const top = document.createElement("div");
    top.className = "dialog-top";
    const caption = document.createElement("p");
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    const img = document.createElement("img");
    top.append(caption, close);
    dialog.append(top, img);
    document.body.append(dialog);
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    for (const link of links) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const source = link.querySelector("img");
        img.src = link.href;
        img.alt = source ? source.alt : "";
        caption.textContent = link.closest("figure")?.querySelector("figcaption")?.textContent || img.alt;
        dialog.showModal();
      });
    }
  }
})();
