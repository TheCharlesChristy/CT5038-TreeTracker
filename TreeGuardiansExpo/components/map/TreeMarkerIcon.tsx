import React from 'react';

interface TreeMarkerIconProps {
  selected?: boolean;
  zoomLevel?: number;
}

const DOT_ZOOM_THRESHOLD = 15.2;

export function getTreeMarkerIconHtml({ selected = false, zoomLevel = 18 }: TreeMarkerIconProps) {
  const isDot = zoomLevel <= DOT_ZOOM_THRESHOLD;
  const markerSize = isDot ? (selected ? 16 : 14) : (selected ? 30 : 26);
  const borderRadius = markerSize / 2;
  const bg = selected
    ? 'linear-gradient(180deg, rgba(14, 56, 25, 0.82) 0%, rgba(14, 56, 25, 0.62) 100%)'
    : 'linear-gradient(180deg, rgba(18, 72, 32, 0.72) 0%, rgba(18, 72, 32, 0.54) 100%)';
  const border = selected
    ? 'rgba(255, 255, 255, 0.34)'
    : 'rgba(255, 255, 255, 0.22)';
  const size = selected ? 'scale(1.08)' : 'scale(1)';
  const shadow = isDot
    ? '0 3px 8px rgba(13, 22, 16, 0.14)'
    : '0 4px 10px rgba(13, 22, 16, 0.12)';
  const iconColor = selected ? 'rgba(245, 250, 246, 0.96)' : 'rgba(240, 247, 242, 0.92)';

  if (isDot) {
    return `
      <div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
        <div style="width:${markerSize}px;height:${markerSize}px;border-radius:${borderRadius}px;background:${bg};border:${isDot ? 1.2 : 1.4}px solid ${border};box-shadow:${shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.22);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;transform:${size};transition:transform 160ms ease, width 180ms ease, height 180ms ease, border-radius 180ms ease;box-sizing:border-box;">
          <svg viewBox="0 0 24 24" width="${selected ? 11 : 10}" height="${selected ? 11 : 10}" aria-hidden="true" style="position:relative;z-index:1;filter:drop-shadow(0 1px 1px rgba(6, 15, 8, 0.12));">
            <path d="M12 2.8c-3.3 0-6 2.5-6 5.8 0 4.2 4.7 8.8 5.5 9.6a.7.7 0 0 0 1 0c.8-.8 5.5-5.4 5.5-9.6 0-3.3-2.7-5.8-6-5.8Z" fill="${iconColor}" />
            <circle cx="12" cy="8.8" r="2.1" fill="rgba(18, 72, 32, 0.5)" />
          </svg>
        </div>
      </div>
    `;
  }

  return `
    <div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
      <div style="width:${markerSize}px;height:${markerSize}px;border-radius:${borderRadius}px;background:${bg};border:${isDot ? 1.2 : 1.4}px solid ${border};box-shadow:${shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.22);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;transform:${size};transition:transform 160ms ease, width 180ms ease, height 180ms ease, border-radius 180ms ease;box-sizing:border-box;">
        <div style="position:absolute;top:2px;left:3px;right:3px;height:12px;border-radius:999px;background:linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.02) 100%);opacity:${selected ? 0.72 : 0.6};"></div>
        <svg viewBox="0 0 24 24" width="${selected ? 17 : 15}" height="${selected ? 17 : 15}" aria-hidden="true" style="position:relative;z-index:1;filter:drop-shadow(0 1px 1px rgba(6, 15, 8, 0.16));">
          <path d="M12 3.2 6.6 9.4h2.7l-3.4 4h2.8L6.7 16h3.8v4.2h3V16h3.8l-2.1-2.6H18l-3.4-4h2.7L12 3.2Z" fill="${iconColor}" />
          <path d="M11 15.5h2v5.1h-2z" fill="rgba(214, 232, 219, 0.85)" />
        </svg>
      </div>
    </div>
  `;
}

export function TreeMarkerIcon({ selected = false, zoomLevel = 18 }: TreeMarkerIconProps) {
  const isDot = zoomLevel <= DOT_ZOOM_THRESHOLD;
  const markerSize = isDot ? (selected ? 16 : 14) : (selected ? 30 : 26);
  const borderRadius = markerSize / 2;
  const bg = selected
    ? 'linear-gradient(180deg, rgba(14, 56, 25, 0.82) 0%, rgba(14, 56, 25, 0.62) 100%)'
    : 'linear-gradient(180deg, rgba(18, 72, 32, 0.72) 0%, rgba(18, 72, 32, 0.54) 100%)';
  const border = selected
      ? 'rgba(255, 255, 255, 0.34)'
      : 'rgba(255, 255, 255, 0.22)';
  const size = selected ? 'scale(1.08)' : 'scale(1)';
  const shadow = isDot
    ? '0 3px 8px rgba(13, 22, 16, 0.14)'
    : '0 4px 10px rgba(13, 22, 16, 0.12)';
  const iconColor = selected ? 'rgba(245, 250, 246, 0.96)' : 'rgba(240, 247, 242, 0.92)';

  return (
    <div
      style={{
        width: 50,
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: markerSize,
          height: markerSize,
          borderRadius,
          background: bg,
          border: `${isDot ? 1.2 : 1.4}px solid ${border}`,
          boxShadow: `${shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.22)`,
          backdropFilter: 'blur(7px)',
          WebkitBackdropFilter: 'blur(7px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          transform: size,
          transition: 'transform 160ms ease, width 180ms ease, height 180ms ease, border-radius 180ms ease',
        }}
      >
        {isDot ? (
          <svg
            viewBox="0 0 24 24"
            width={selected ? 11 : 10}
            height={selected ? 11 : 10}
            aria-hidden="true"
            style={{
              position: 'relative',
              zIndex: 1,
              filter: 'drop-shadow(0 1px 1px rgba(6, 15, 8, 0.12))',
            }}
          >
            <path
              d="M12 2.8c-3.3 0-6 2.5-6 5.8 0 4.2 4.7 8.8 5.5 9.6a.7.7 0 0 0 1 0c.8-.8 5.5-5.4 5.5-9.6 0-3.3-2.7-5.8-6-5.8Z"
              fill={iconColor}
            />
            <circle
              cx="12"
              cy="8.8"
              r="2.1"
              fill="rgba(18, 72, 32, 0.5)"
            />
          </svg>
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: 3,
              right: 3,
              height: 12,
              borderRadius: 999,
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.02) 100%)',
              opacity: selected ? 0.72 : 0.6,
            }}
          />
        )}

        {!isDot ? (
          <svg
            viewBox="0 0 24 24"
            width={selected ? 17 : 15}
            height={selected ? 17 : 15}
            aria-hidden="true"
            style={{
              position: 'relative',
              zIndex: 1,
              filter: 'drop-shadow(0 1px 1px rgba(6, 15, 8, 0.16))',
            }}
          >
            <path
              d="M12 3.2 6.6 9.4h2.7l-3.4 4h2.8L6.7 16h3.8v4.2h3V16h3.8l-2.1-2.6H18l-3.4-4h2.7L12 3.2Z"
              fill={iconColor}
            />
            <path
              d="M11 15.5h2v5.1h-2z"
              fill="rgba(214, 232, 219, 0.85)"
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
}
