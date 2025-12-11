import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
// import * as Updates from 'expo-updates';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught Error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRestart = async () => {
        Alert.alert("Restart Required", "Please close and reopen the app.");
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.title}>🙈 Oops! Something went wrong.</Text>
                        <Text style={styles.subtitle}>
                            The app ran into a problem and needs to restart.
                        </Text>

                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                {this.state.error && this.state.error.toString()}
                            </Text>
                            {this.state.errorInfo && (
                                <Text style={styles.stackText}>
                                    {this.state.errorInfo.componentStack}
                                </Text>
                            )}
                        </View>

                        <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
                            <Text style={styles.buttonText}>Restart App</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
        paddingTop: 50,
    },
    scroll: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#d32f2f',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        color: '#555',
    },
    errorBox: {
        backgroundColor: '#ffebee',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ef9a9a',
        marginBottom: 20,
        width: '100%',
    },
    errorText: {
        color: '#c62828',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    stackText: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#333',
    },
    button: {
        backgroundColor: '#d32f2f',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ErrorBoundary;
