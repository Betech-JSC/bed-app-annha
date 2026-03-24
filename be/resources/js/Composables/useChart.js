/**
 * BED CRM — Chart.js Configuration Composable
 * Curated colors, smooth animations, premium defaults
 */

export const CHART_COLORS = {
  primary: [
    '#1B4F72',  // Deep Ocean
    '#F39C12',  // Warm Amber
    '#1D8348',  // Forest Green
    '#8E44AD',  // Royal Purple
    '#E74C3C',  // Crimson
    '#2E86C1',  // Sky Blue
    '#D68910',  // Dark Amber
    '#117A65',  // Teal
  ],
  soft: [
    'rgba(27, 79, 114, 0.75)',
    'rgba(243, 156, 18, 0.75)',
    'rgba(29, 131, 72, 0.75)',
    'rgba(142, 68, 173, 0.75)',
    'rgba(231, 76, 60, 0.75)',
    'rgba(46, 134, 193, 0.75)',
  ],
  backgrounds: [
    'rgba(27, 79, 114, 0.12)',
    'rgba(243, 156, 18, 0.12)',
    'rgba(29, 131, 72, 0.12)',
    'rgba(142, 68, 173, 0.12)',
    'rgba(231, 76, 60, 0.12)',
    'rgba(46, 134, 193, 0.12)',
  ],
  gradients: {
    revenue: ['#1B4F72', '#AED6F1'],
    profit:  ['#1D8348', '#82E0AA'],
    cost:    ['#E74C3C', '#F1948A'],
    accent:  ['#8E44AD', '#D2B4DE'],
  }
}

export function useChart() {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 13, family: "'Inter', sans-serif", weight: '500' },
          color: '#5D6B82',
        }
      },
      tooltip: {
        backgroundColor: '#1A1A2E',
        titleFont: { size: 14, weight: '600', family: "'Inter', sans-serif" },
        bodyFont: { size: 13, family: "'Inter', sans-serif" },
        padding: { top: 10, bottom: 10, left: 14, right: 14 },
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 6,
        caretPadding: 8,
        caretSize: 6,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#9CA3AF',
          font: { size: 12, family: "'Inter', sans-serif" },
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: '#F3F5F7',
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF',
          font: { size: 12, family: "'Inter', sans-serif" },
          callback: (value) => formatCompact(value),
        },
        border: { display: false },
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3,
      },
      point: {
        radius: 0,
        hoverRadius: 6,
        hoverBorderWidth: 3,
        hoverBackgroundColor: '#fff',
      },
      bar: {
        borderRadius: 8,
        borderSkipped: false,
      },
      arc: {
        borderWidth: 0,
      }
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  }

  const doughnutOptions = {
    ...defaultOptions,
    cutout: '72%',
    scales: {},
    plugins: {
      ...defaultOptions.plugins,
      legend: {
        ...defaultOptions.plugins.legend,
        position: 'right',
      }
    }
  }

  const barOptions = {
    ...defaultOptions,
    indexAxis: 'y',
    scales: {
      x: {
        ...defaultOptions.scales.x,
        grid: { color: '#F3F5F7', drawBorder: false },
      },
      y: {
        ...defaultOptions.scales.y,
        grid: { display: false },
        ticks: {
          ...defaultOptions.scales.y.ticks,
          callback: undefined,
        },
      }
    }
  }

  function createGradient(ctx, color1, color2) {
    if (!ctx) return color1
    const gradient = ctx.createLinearGradient(0, 0, 0, 300)
    gradient.addColorStop(0, color1)
    gradient.addColorStop(1, color2 + '10')
    return gradient
  }

  function formatCurrency(value) {
    if (!value && value !== 0) return '0đ'
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value)
  }

  function formatNumber(value) {
    if (!value && value !== 0) return '0'
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  function formatCompact(value) {
    if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(1) + 'T'
    if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(1) + 'Tr'
    if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(0) + 'K'
    return value.toString()
  }

  return {
    defaultOptions,
    doughnutOptions,
    barOptions,
    createGradient,
    formatCurrency,
    formatNumber,
    formatCompact,
    CHART_COLORS,
  }
}
