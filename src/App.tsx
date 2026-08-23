import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { NavTab } from './components/layout/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { MemberDetail } from './pages/MemberDetail';
import { Payments } from './pages/Payments';
import { Unpaid } from './pages/Unpaid';
import { MembershipPlans } from './pages/MembershipPlans';
import { Receipts } from './pages/Receipts';
import { WhatsApp } from './pages/WhatsApp';
import { Settings } from './pages/Settings';

export const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleBackToMembers = () => {
    setSelectedMemberId(null);
  };

  const handleNavigateTab = (tab: NavTab) => {
    setSelectedMemberId(null);
    setCurrentTab(tab);
  };

  const handleGlobalSearch = (query: string) => {
    setGlobalSearch(query);
    if (query.trim() && currentTab !== 'members' && !selectedMemberId) {
      setCurrentTab('members');
    }
  };

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={handleNavigateTab}
      onGlobalSearch={handleGlobalSearch}
    >
      {selectedMemberId ? (
        <MemberDetail
          memberId={selectedMemberId}
          onBack={handleBackToMembers}
        />
      ) : (
        <>
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigateTab={handleNavigateTab}
              onSelectMemberDetail={handleSelectMember}
            />
          )}

          {currentTab === 'members' && (
            <Members
              onSelectMemberDetail={handleSelectMember}
              searchQueryProp={globalSearch}
            />
          )}

          {currentTab === 'payments' && (
            <Payments
              onSelectMemberDetail={handleSelectMember}
            />
          )}

          {currentTab === 'unpaid' && (
            <Unpaid
              onSelectMemberDetail={handleSelectMember}
            />
          )}

          {currentTab === 'plans' && (
            <MembershipPlans />
          )}

          {currentTab === 'receipts' && (
            <Receipts />
          )}

          {currentTab === 'whatsapp' && (
            <WhatsApp />
          )}

          {currentTab === 'settings' && (
            <Settings />
          )}
        </>
      )}
    </Layout>
  );
};
