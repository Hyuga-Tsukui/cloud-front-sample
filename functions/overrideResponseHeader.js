function handler(event) {
  var request = event.request;
  var response = event.response;
  var headers = response.headers;

  // Set json content type for all json responses
  if (request.uri.endsWith(".json")) {
    headers["content-type"] = { value: "application/json" };
  }
  return response;
}
