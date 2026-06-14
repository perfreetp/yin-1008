export default defineAppConfig({
  pages: [
    'pages/orders/index',
    'pages/calendar/index',
    'pages/shops/index',
    'pages/delivery/index',
    'pages/stats/index',
    'pages/order-edit/index',
    'pages/order-detail/index',
    'pages/inspection/index',
    'pages/reminder-center/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#8B5CF6',
    navigationBarTitleText: '手办预订追踪',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F8F7FC'
  },
  tabBar: {
    color: '#9CA3AF',
    selectedColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/orders/index',
        text: '预订列表'
      },
      {
        pagePath: 'pages/calendar/index',
        text: '付款日历'
      },
      {
        pagePath: 'pages/shops/index',
        text: '店铺记录'
      },
      {
        pagePath: 'pages/delivery/index',
        text: '到货验收'
      },
      {
        pagePath: 'pages/stats/index',
        text: '预算统计'
      }
    ]
  }
})
