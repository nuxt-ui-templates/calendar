// A control floating on the chrome as its own drop of glass, or a group of
// them sharing one, the way the iOS toolbar draws them
export const glassClasses = 'bg-(--glass-control-bg) glass-control'

// The same on a button that is the drop itself, lighter under the pointer
export const glassButtonClasses = `${glassClasses} hover:bg-(--glass-control-bg-hover) active:bg-(--glass-control-bg-hover)`
