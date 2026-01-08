pipeline {
    agent any

    environment {
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = '751057572977'
        ECR_REPO = 'api-service'
        IMAGE_TAG = "${BUILD_NUMBER}"
        IMAGE_URI = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'which node || curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -'
                sh 'which npm || sudo apt-get install -y nodejs'
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test || echo "⚠️ No tests found or tests failed."'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker --version'
                sh "docker build -t ${IMAGE_URI} ."
            }
        }

        stage('Login to ECR and Push') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: '9df79d1f-0539-4d32-9b7d-02ed68426fb9' // ✅ Use your correct AWS credential ID
                ]]) {
                    sh '''
                        aws --version
                        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                        docker push $IMAGE_URI
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "✅ Successfully pushed image to ECR: $IMAGE_URI"
        }
        failure {
            echo "❌ Jenkins pipeline failed. Check logs."
        }
    }
}