import React, { createContext, useContext, useEffect, useState } from 'react';
import { Octokit } from 'octokit';

interface GitHubContextType {
    token: string | null;
    user: any | null;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
    octokit: Octokit | null;
    currentRepo: string | null;
    listRepos: () => Promise<any[]>;
    createRepo: (name: string, description?: string) => Promise<any>;
    selectRepo: (name: string) => void;
    currentBranch: string;
    listBranches: () => Promise<any[]>;
    createBranch: (name: string) => Promise<void>;
    switchBranch: (name: string) => void;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('github_token'));
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [octokit, setOctokit] = useState<Octokit | null>(null);
    const [currentRepo, setCurrentRepo] = useState<string | null>(localStorage.getItem('github_repo'));
    const [currentBranch, setCurrentBranch] = useState<string>(localStorage.getItem('github_branch') || 'main');

    useEffect(() => {
        // Check for token in URL (callback from backend)
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');

        if (urlToken) {
            setToken(urlToken);
            localStorage.setItem('github_token', urlToken);
            // Clear URL param
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    useEffect(() => {
        if (token) {
            const octokitInstance = new Octokit({ auth: token });
            setOctokit(octokitInstance);

            octokitInstance.rest.users.getAuthenticated()
                .then(({ data }) => {
                    setUser(data);
                })
                .catch((err) => {
                    console.error("Failed to get user", err);
                    logout(); // Token might be invalid
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [token]);

    const login = () => {
        window.location.href = 'http://localhost:5001/auth/github';
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setOctokit(null);
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_repo');
        localStorage.removeItem('github_branch');
        setCurrentRepo(null);
        setCurrentBranch('main');
    };

    const listRepos = async () => {
        if (!token) return [];
        // We'll need to instantiate a temp service or store service in state? 
        // Better: Make GitHubService accessible or recreate octokit here? 
        // Actually, we can just use the octokit instance directly for now or import the service logic.
        // For consistency, let's just use octokit directly here or create a service instance.
        // Let's create a service instance on demand for now to keep it clean.
        // Or better: Just use octokit.
        const octokitInstance = new Octokit({ auth: token });
        const { data } = await octokitInstance.rest.repos.listForAuthenticatedUser({
            sort: 'updated',
            direction: 'desc',
            per_page: 100
        });
        return data;
    };

    const createRepo = async (name: string, description: string = "Created by EcoNarrative Studio") => {
        if (!token) throw new Error("Not authenticated");
        const octokitInstance = new Octokit({ auth: token });
        const { data } = await octokitInstance.rest.repos.createForAuthenticatedUser({
            name,
            description,
            private: true,
            auto_init: true,
        });
        selectRepo(name);
        return data;
    }

    const selectRepo = (name: string) => {
        setCurrentRepo(name);
        localStorage.setItem('github_repo', name);
    };

    const listBranches = async () => {
        if (!token || !currentRepo) return [];
        const octokitInstance = new Octokit({ auth: token });
        // Use raw octokit here or duplicate logic, simpler to use logic:
        const { data } = await octokitInstance.rest.repos.listBranches({
            owner: user.login,
            repo: currentRepo,
        });
        return data;
    };

    const createBranch = async (name: string) => {
        if (!token || !currentRepo) throw new Error("Not authenticated or repo not selected");
        const octokitInstance = new Octokit({ auth: token });

        // Get SHA of current branch head
        const { data: refData } = await octokitInstance.rest.git.getRef({
            owner: user.login,
            repo: currentRepo,
            ref: `heads/${currentBranch}`,
        });
        const sha = refData.object.sha;

        await octokitInstance.rest.git.createRef({
            owner: user.login,
            repo: currentRepo,
            ref: `refs/heads/${name}`,
            sha,
        });

        switchBranch(name);
    };

    const switchBranch = (name: string) => {
        setCurrentBranch(name);
        localStorage.setItem('github_branch', name);
    };

    return (
        <GitHubContext.Provider value={{ token, user, isLoading, login, logout, octokit, currentRepo, listRepos, createRepo, selectRepo, currentBranch, listBranches, createBranch, switchBranch }}>
            {children}
        </GitHubContext.Provider>
    );
};

export const useGitHub = () => {
    const context = useContext(GitHubContext);
    if (context === undefined) {
        throw new Error('useGitHub must be used within a GitHubProvider');
    }
    return context;
};
