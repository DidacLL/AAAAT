(() => {
  "use strict";
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
