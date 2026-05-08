import {
  UI_THEME_IDS,
  UI_TEXT_SIZE_IDS,
  type UiThemeId,
  type UiTextSizeId,
  textSizeLabel,
  themeLabel,
} from '@/lib/ui-preferences';

type UnitSystem = 'imperial' | 'metric';

function themeAriaLabel(id: UiThemeId): string {
  // Explicit labels so assistive tech describes intent, not only the visible name.
  switch (id) {
    case 'mint':
      return 'Select Mint eye-comfort theme';
    case 'sepia':
      return 'Select Sepia eye-comfort theme';
    case 'standard':
      return 'Select Standard theme';
    case 'hc_black':
      return 'Select High Contrast Black theme';
    case 'hc_charcoal':
      return 'Select High Contrast Charcoal theme';
    case 'hc_blue':
      return 'Select High Contrast Blue theme';
    case 'hc_yellow':
      return 'Select High Contrast Yellow theme';
    default:
      return `Select ${themeLabel(id)} theme`;
  }
}

type PreferencesCardProps = {
  theme: UiThemeId;
  textSize: UiTextSizeId;
  unitSystem: UnitSystem;
  onThemeChange: (theme: UiThemeId) => void;
  onTextSizeChange: (size: UiTextSizeId) => void;
  onUnitSystemChange: (units: UnitSystem) => void;
};

function segmentLabelClass(selected: boolean): string {
  const base =
    'flex min-h-[2.75rem] min-w-[140px] shrink-0 basis-[160px] cursor-pointer items-center justify-center rounded-lg border-2 px-2 py-2 text-center text-sm font-medium leading-snug transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-[color:var(--app-focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--app-bg)] sm:min-w-[180px] sm:flex-1 sm:shrink sm:basis-[200px] sm:px-3 sm:text-base';
  return selected
    ? `${base} border-[color:var(--app-accent)] bg-[color:var(--app-accent)] text-[color:var(--app-accent-fg)]`
    : `${base} border-[color:var(--app-border)] bg-transparent text-[color:var(--app-fg)] hover:border-[color:var(--app-accent)]`;
}

export function PreferencesCard({
  theme,
  textSize,
  onThemeChange,
  onTextSizeChange,
  unitSystem,
  onUnitSystemChange,
}: PreferencesCardProps) {
  return (
    <section
      aria-labelledby="preferences-heading"
      className="min-w-0 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 shadow-sm sm:p-6">
      <h2
        id="preferences-heading"
        className="text-xl font-medium text-[color:var(--app-fg)]">
        Preferences
      </h2>
      <p className="mt-1 max-w-prose break-words text-[color:var(--app-fg-muted)]">
        Theme and text size are tuned for WCAG 2.1 AAA contrast. Field errors on
        high-contrast themes use magenta or orange for maximum visibility.
      </p>

      <fieldset className="preferences-segment-group m-0 min-w-0 border-0 p-0">
        <legend className="mt-6 font-medium text-[color:var(--app-fg)]">
          Theme
        </legend>
        <div className="mt-2 flex w-full min-w-0 flex-wrap gap-2">
          {UI_THEME_IDS.map((id) => (
            <label
              key={id}
              className={segmentLabelClass(theme === id)}
              aria-label={themeAriaLabel(id)}>
              <input
                type="radio"
                name="pref-ui-theme"
                value={id}
                checked={theme === id}
                onChange={() => onThemeChange(id)}
                className="sr-only"
              />
              <span className="min-w-0 break-words">{themeLabel(id)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="preferences-segment-group m-0 min-w-0 border-0 p-0">
        <legend className="mt-6 font-medium text-[color:var(--app-fg)]">
          Font size
        </legend>
        <div className="mt-2 flex w-full min-w-0 flex-wrap gap-2">
          {UI_TEXT_SIZE_IDS.map((id) => (
            <label key={id} className={segmentLabelClass(textSize === id)}>
              <input
                type="radio"
                name="pref-ui-text-size"
                value={id}
                checked={textSize === id}
                onChange={() => onTextSizeChange(id)}
                className="sr-only"
              />
              <span className="min-w-0 break-words">{textSizeLabel(id)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="preferences-segment-group m-0 min-w-0 border-0 p-0">
        <legend className="mt-6 font-medium text-[color:var(--app-fg)]">
          Weight units
        </legend>
        <div className="mt-2 flex w-full min-w-0 flex-wrap gap-2">
          <label className={segmentLabelClass(unitSystem === 'imperial')}>
            <input
              type="radio"
              name="pref-weight-units"
              value="imperial"
              checked={unitSystem === 'imperial'}
              onChange={() => onUnitSystemChange('imperial')}
              className="sr-only"
            />
            <span>Imperial (lbs)</span>
          </label>
          <label className={segmentLabelClass(unitSystem === 'metric')}>
            <input
              type="radio"
              name="pref-weight-units"
              value="metric"
              checked={unitSystem === 'metric'}
              onChange={() => onUnitSystemChange('metric')}
              className="sr-only"
            />
            <span>Metric (kg)</span>
          </label>
        </div>
      </fieldset>
    </section>
  );
}
