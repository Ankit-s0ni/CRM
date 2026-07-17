enum ApiAvailability {
  online,
  offline,
  sessionExpired,
  workspaceUnavailable,
  providerUnavailable,
}

class ApiAvailabilityEvent {
  const ApiAvailabilityEvent(this.state, {this.code, this.message});

  final ApiAvailability state;
  final String? code;
  final String? message;
}
