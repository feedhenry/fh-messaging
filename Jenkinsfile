//https://github.com/feedhenry/fh-pipeline-library

fhBuildNode {
    stage('Install Dependencies') {
        dir('fh-messaging') {
            sh """
            echo "registry = http://nexus-wendy.ci.feedhenry.org/repository/npm/" > .npmrc
            mv npm-shrinkwrap.json npm-shrinkwrap.json.old
            cat npm-shrinkwrap.json.old | \
            sed "s#http://registry.npmjs.org/#http://nexus-wendy.ci.feedhenry.org/repository/npm/#g" | \
            sed "s#https://registry.npmjs.org/#http://nexus-wendy.ci.feedhenry.org/repository/npm/#g" > npm-shrinkwrap.json
            """
            npmInstall {}
        }
        dir('fh-metrics') {
            sh """
            echo "registry = http://nexus-wendy.ci.feedhenry.org/repository/npm/" > .npmrc
            mv npm-shrinkwrap.json npm-shrinkwrap.json.old
            cat npm-shrinkwrap.json.old | \
            sed "s#http://registry.npmjs.org/#http://nexus-wendy.ci.feedhenry.org/repository/npm/#g" | \
            sed "s#https://registry.npmjs.org/#http://nexus-wendy.ci.feedhenry.org/repository/npm/#g" > npm-shrinkwrap.json
            """
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
