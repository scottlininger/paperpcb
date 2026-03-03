/**
 * @fileoverview A simple nav structure for the docs navigation pages. 
 */
const nav = {
  chapters: [
    {
      label: "Getting started",
      path: "/docs",
      links: [
        { label: "PCBs at home?", path: "/docs" },
        { label: "What you need", path: "/docs/getting-started/what-you-need" },
        { label: "Pros and cons", path: "/docs/getting-started/pros-and-cons" },
        { label: "PaperPCB Studio", path: "/docs/getting-started/paperpcb-studio" },
        { label: "Mr. Stabby", path: "/docs/getting-started/mr-stabby" },
      ]
    },
    {
      label: "Designing",
      path: "/docs/designing",
      links: [
        { label: "Board flavors", path: "/docs/designing" },
        { label: "Layer naming", path: "/docs/designing/layer naming" },
        { label: "KiCad / EasyEDA", path: "/docs/designing/kicad-easyeda" },
        { label: "Photoshop / GIMP", path: "/docs/designing/photoshop-gimp" },
        { label: "Other software", path: "/docs/designing/other-software" }
      ]
    },
    {
      label: "Tutorials",
      path: "/docs/tutorials",
      links: [
        { label: "1-sided, no mask", path: "/docs/tutorials" },
        { label: "1-sided, blank mask", path: "/docs/tutorials/1-sided-blank-mask" },
        { label: "1-sided, printed mask", path: "/docs/tutorials/1-sided-printed-mask" },
        { label: "2-layer", path: "/docs/tutorials/2-layer" },
        { label: "3+ layers", path: "/docs/tutorials/3-plus-layers" },
        { label: "Flexible PCBs", path: "/docs/tutorials/flexible-pcbs" },
        { label: "PCB-mounted PCBs", path: "/docs/tutorials/pcb-mounted-pcbs" },
        { label: "Vias", path: "/docs/tutorials/vias" }
      ]
    },
    {
      label: "Cutting Machines",
      path: "/docs/machines",
      links: [
        { label: "Cricut Maker", path: "/docs/machines" },
        { label: "Cricut Joy", path: "/docs/machines/cricut-joy" },
        { label: "Silhouette Cameo", path: "/docs/machines/silhouette-cameo" },
        { label: "Other machines", path: "/docs/machines/other-machines" }
      ]
    },
    {
      label: "Materials",
      path: "/docs/materials",
      links: [
        { label: "Copper tape", path: "/docs/materials/copper-tape" },
        { label: "Paper / cardstock", path: "/docs/materials/paper-cardstock" },
        { label: "Sticker paper", path: "/docs/materials/sticker-paper" },
        { label: "Shelving paper", path: "/docs/materials/shelving-paper" },
        { label: "Craft foam", path: "/docs/materials/craft-foam" },
        { label: "Chipboard", path: "/docs/materials/chipboard" },
        { label: "Cardboard", path: "/docs/materials/cardboard" },
        { label: "Kapton tape", path: "/docs/materials/kapton-tape" },
        { label: "Vinyl", path: "/docs/materials/vinyl" },
        { label: "Wood", path: "/docs/materials/wood" },
        { label: "3D prints", path: "/docs/materials/3d-prints" }
      ]
    },
    {
      label: "Soldering",
      path: "/docs/soldering",
      links: [
        { label: "Pins and Vias", path: "/docs/soldering/pins-and-vias" },
        { label: "Solder masks", path: "/docs/soldering/solder-masks" },
        { label: "Printed graphics", path: "/docs/soldering/printed-graphics" },
        { label: "Surface mount", path: "/docs/soldering/surface-mount" },
        { label: "Hotplate", path: "/docs/soldering/hotplate" },
        { label: "Solder-free craft foam", path: "/docs/soldering/solder-free-craft-foam" }
      ]
    },
    {
      label: "Community",
      path: "/",
      links: [
        { label: "About", path: "/about" },
        { label: "Get help", path: "/help" },
        { label: "Contribute", path: "/contribute" },
        { label: "Future wishlist", path: "/wishlist" }

      ]
    }
  ]
};


// Calculate some other views in to the data for convenience.
nav.chaptersByLabel = {};
nav.chaptersByPath = {};
nav.linksByPath = {};

for (const chapter of nav.chapters) {
  nav.chaptersByLabel[chapter.label] = chapter;
}

for (const chapter of nav.chapters) {
  for (const link of chapter.links) {
    nav.linksByPath[link.path] = link;
    nav.chaptersByPath[link.path] = chapter;
  }
  nav.chaptersByPath[chapter.path] = chapter;
}



export default nav;
