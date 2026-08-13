export default defineAppConfig({
  ui: {
    colors: {
      primary: 'red',
      neutral: 'zinc'
    },
    // Overlays portal to the body root with no stacking of their own, so the
    // floating header and the sticky day bars would paint over them
    tooltip: {
      slots: {
        content: 'z-50'
      }
    },
    popover: {
      slots: {
        content: 'z-50'
      }
    },
    contextMenu: {
      slots: {
        content: 'z-50'
      }
    }
  }
})
