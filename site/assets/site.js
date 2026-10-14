(() => {
  "use strict";
  const chapters = [...document.querySelectorAll(".guide-chapter")];
  const expand = document.querySelector("[data-guide-expand]");
  if (expand) {
    expand.addEventListener("click", () => {
      const open = chapters.some(chapter => !chapter.open);
      chapters.forEach(chapter => { chapter.open = open; });
      expand.textContent = open ? "Collapse all chapters" : "Expand all chapters";
    });
    chapters.forEach(chapter => chapter.addEventListener("toggle", () => {
      expand.textContent = chapters.every(item => item.open) ? "Collapse all chapters" : "Expand all chapters";
    }));
  }
  const revealChapter = () => {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    const chapter = target.querySelector(".guide-chapter") || target.closest(".guide-chapter");
    if (chapter) {
      chapter.open = true;
      requestAnimationFrame(() => target.scrollIntoView({block:"start"}));
    }
  };
  window.addEventListener("hashchange", revealChapter);
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (link && link.hash === location.hash) revealChapter();
  });
  revealChapter();
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
    const fullSize = document.createElement("a");
    fullSize.textContent = "Open full-size image";
    fullSize.target = "_blank";
    fullSize.rel = "noopener";
    const img = document.createElement("img");
    top.append(caption, fullSize, close);
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
        fullSize.href = link.href;
        img.alt = source ? source.alt : "";
        caption.textContent = link.closest("figure")?.querySelector("figcaption")?.textContent || img.alt;
        dialog.showModal();
      });
    }
  }
})();
