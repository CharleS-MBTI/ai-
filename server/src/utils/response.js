/**
 * 统一API响应格式
 */
function success(data, message = 'success') {
  return {
    code: 0,
    message,
    data,
  };
}

function fail(code, message) {
  return {
    code,
    message,
    data: null,
  };
}

function paginated(list, total, page, pageSize) {
  return {
    code: 0,
    message: 'success',
    data: {
      list,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  };
}

module.exports = { success, fail, paginated };
