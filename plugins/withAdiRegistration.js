const { withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const TOKEN = 'DPHPXBYNBWPMKAAAAAAAAAAAAA';
const FILE_NAME = 'adi-registration.properties';
const GRADLE_MARKER = 'adi-registration-task';

module.exports = function withAdiRegistration(config) {
  // Write the token file into src/main/assets during prebuild
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'assets'
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, FILE_NAME), TOKEN);
      return config;
    },
  ]);

  // Add a Gradle task that re-injects the file right before assets are merged,
  // in case the bundler clears the assets directory during compilation.
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(GRADLE_MARKER)) {
      config.modResults.contents += `

// ${GRADLE_MARKER}: inject Google Play ownership token before assets are packaged
android.applicationVariants.configureEach { variant ->
    variant.mergeAssetsProvider.configure { task ->
        task.doFirst {
            def assetsDir = new File(projectDir, "src/main/assets")
            assetsDir.mkdirs()
            new File(assetsDir, "${FILE_NAME}").text = "${TOKEN}"
        }
    }
}
`;
    }
    return config;
  });

  return config;
};
