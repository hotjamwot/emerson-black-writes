import { registerEmersonTheme } from "./quartz/theme/emerson"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

// The Brain's brand colours live in the theme, not in a fight against it — this
// must run before any theme id is resolved. See quartz/theme/emerson.ts.
registerEmersonTheme()

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
