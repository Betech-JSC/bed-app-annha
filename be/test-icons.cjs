const icons = require('@ant-design/icons-vue');
const names = ['ArrowLeftOutlined', 'EditOutlined', 'PlusOutlined', 'DeleteOutlined',
  'SendOutlined', 'CheckCircleOutlined', 'CloseCircleOutlined', 'PlayCircleOutlined',
  'CheckOutlined', 'CloseOutlined', 'DollarOutlined', 'ReloadOutlined',
  'UploadOutlined', 'DownloadOutlined', 'FileOutlined',
  'UserOutlined', 'CalendarOutlined', 'EyeOutlined', 'CheckSquareOutlined',
  'LinkOutlined', 'CameraOutlined', 'CheckCircleFilled', 'MoreOutlined',
  'SyncOutlined', 'DownOutlined', 'ExclamationCircleOutlined', 'WarningOutlined',
  'ProjectOutlined', 'CloudOutlined', 'TeamOutlined', 'PictureOutlined',
  'FilePdfOutlined', 'FileWordOutlined', 'FileExcelOutlined', 'ClockCircleOutlined',
  'LineChartOutlined', 'FileProtectOutlined', 'BankOutlined', 'HistoryOutlined',
  'FileAddOutlined', 'SafetyCertificateOutlined', 'PaperClipOutlined',
  'CalculatorOutlined'];
names.forEach(name => {
  if (!icons[name]) console.log('INVALID:', name);
});
