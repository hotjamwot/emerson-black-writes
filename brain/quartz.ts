import { registerEmersonTheme } from "./quartz/theme/emerson"
import { registerDefaultColorMode } from "./quartz/default-color-mode"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

// The Brain's brand colours live in the theme, not in a fight against it — this
// must run before any theme id is resolved. See quartz/theme/emerson.ts.
registerEmersonTheme()

// Open dark for first-time visitors while keeping the light/dark toggle.
registerDefaultColorMode()

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
