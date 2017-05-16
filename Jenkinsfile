//https://github.com/feedhenry/fh-pipeline-library

fhBuildNode {
    stage('Install Dependencies') {
        dir('fh-messaging') {
            npmInstall {}
        }
        dir('fh-metrics') {
            npmInstall {}
        }
    }

    stage('Build') {
        dir('fh-messaging') {
            gruntCmd {
                cmd = 'fh:dist --only-bundle-deps'
            }
        }
        dir('fh-metrics') {
            gruntCmd {
                cmd = 'fh:dist --only-bundle-deps'
            }
        }
        archiveArtifacts "fh-messaging/dist/fh-messaging*.tar.gz, fh-metrics/dist/fh-metrics*.tar.gz"
    }
}
