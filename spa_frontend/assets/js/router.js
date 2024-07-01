// Define a function to create and initialize the router
function createRouter(routes) {
  // Initialize the router
  function init() {
    // Listen for navigation events
    window.addEventListener("popstate", route);

    // Handle initial navigation on page load
    route();
  }

  // Navigate to a specific route
  function navigate(path) {
    history.pushState(null, null, path);
    route();
  }

  // Handle routing based on current URL path
  function route() {
    const path = window.location.pathname;
    let matchedRoute = null;
    let params = {};

    // Find the matching route
    for (const routePath in routes) {
      const routePattern = getRoutePattern(routePath);
      const match = path.match(routePattern);

      if (match) {
        matchedRoute = routes[routePath];
        // Extract params from the URL
        params = extractParams(routePath, match);
        break;
      }
    }

    // Execute matched route handler or default route
    if (matchedRoute) {
      matchedRoute(params);
    } else {
      routes["default"](); // Handle default route
    }
  }

  // Helper function to convert route path to regex pattern
  function getRoutePattern(routePath) {
    // Convert "/about/:id" to "/about/([^/]+)"
    return new RegExp(`^${routePath.replace(/:\w+/g, "([^/]+)")}$`);
  }

  // Helper function to extract params from matched URL
  function extractParams(routePath, match) {
    const paramNames = routePath.match(/:\w+/g) || [];
    const params = {};
    paramNames.forEach((paramName, index) => {
      params[paramName.substring(1)] = match[index + 1];
    });
    return params;
  }

  // Return public methods for external use
  return {
    init,
    navigate,
  };
}

// Export the createRouter function for use in other scripts
export { createRouter };
