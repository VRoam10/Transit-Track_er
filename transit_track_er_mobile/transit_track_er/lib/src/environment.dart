class Environment {
  static const bool isProduction = bool.fromEnvironment('dart.vm.product');

  static String get baseUrl {
    if (isProduction) {
      return "https://api.myproductionserver.com"; // Prod
    } else {
      return "http://10.0.2.2:3000"; // Dev (Emulator)
    }
  }
}
