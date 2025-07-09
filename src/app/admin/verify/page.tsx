// src/app/admin/verify/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ADMIN_USER_UIDS } from '@/config/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, ShieldCheck, AlertCircle, ExternalLink, KeyRound, Building, Mail, FileText, CalendarDays, Edit3, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProviderProfile, Certification } from '@/models/provider';
import { fetchAllProvidersForAdminAction, setProviderVerificationStatusAction, updateCertificationStatusAction } from '../actions';
import { format } from 'date-fns';
import Link from 'next/link';

interface AdminProviderProfile extends ProviderProfile {
  email?: string;
}

export default function AdminVerificationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean | undefined>(undefined);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [providers, setProviders] = useState<AdminProviderProfile[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for editing
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [currentVerificationStatus, setCurrentVerificationStatus] = useState(false);
  const [verificationAuthority, setVerificationAuthority] = useState('');

  const [editingCertProviderId, setEditingCertProviderId] = useState<string | null>(null);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [currentCertStatus, setCurrentCertStatus] = useState<Certification['status']>('pending_review');
  const [certVerificationNotes, setCertVerificationNotes] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const isAdminCheck = ADMIN_USER_UIDS.includes(user.uid);
        setIsAdminUser(isAdminCheck);
        if (!isAdminCheck) {
          router.replace('/'); // Or an access denied page
        } else {
          fetchProviders();
        }
      } else {
        setIsAdminUser(false);
        router.replace('/auth/login?redirect=/admin/verify');
      }
      setIsLoadingPage(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchProviders = async () => {
    if (!currentUser) return;
    setIsLoadingProviders(true);
    setError(null);
    try {
      const result = await fetchAllProvidersForAdminAction(currentUser.uid);
      if (result.error) {
        setError(result.error);
      } else {
        setProviders(result.providers || []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load providers data.");
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const handleUpdateProviderVerification = async (providerId: string) => {
    if (!currentUser) return;
    setIsLoadingProviders(true); // Use main loader for this action
    const result = await setProviderVerificationStatusAction(currentUser.uid, providerId, currentVerificationStatus, verificationAuthority || null);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      fetchProviders(); // Re-fetch to show updated status
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setEditingProviderId(null);
    setIsLoadingProviders(false);
  };

  const handleUpdateCertification = async () => {
    if (!currentUser || !editingCertProviderId || !editingCertId) return;
    setIsLoadingProviders(true);
    const result = await updateCertificationStatusAction(currentUser.uid, editingCertProviderId, editingCertId, currentCertStatus, certVerificationNotes || null);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      fetchProviders();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setEditingCertId(null);
    setEditingCertProviderId(null);
    setIsLoadingProviders(false);
  };

  if (isLoadingPage || isAdminUser === undefined) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-4">Loading Admin Panel...</p></div>;
  }

  if (!isAdminUser) {
    return <div className="container mx-auto p-8 text-center"><AlertCircle className="mx-auto h-12 w-12 text-destructive" /><h1 className="text-2xl mt-4">Access Denied</h1><p>You do not have permission to view this page.</p></div>;
  }

  const certificationStatuses: Certification['status'][] = ['pending_review', 'verified', 'requires_attention', 'expired', 'not_applicable'];


  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center"><ShieldCheck className="mr-3 h-8 w-8 text-primary"/>Provider & Certification Verification</CardTitle>
          <CardDescription>Manage provider verification status and review submitted certifications.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProviders && <div className="text-center p-4"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> <p>Loading providers...</p></div>}
          {error && <p className="text-destructive text-center">{error}</p>}
          
          {!isLoadingProviders && providers.length === 0 && !error && (
            <p className="text-muted-foreground text-center py-6">No providers found or registered yet.</p>
          )}

          {!isLoadingProviders && providers.length > 0 && (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {providers.map(provider => (
                <AccordionItem value={provider.id} key={provider.id} className="border rounded-lg shadow-sm bg-card">
                  <AccordionTrigger className="p-4 hover:bg-muted/50 rounded-t-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between w-full">
                        <div className="flex items-center mb-2 md:mb-0">
                            <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold text-lg text-primary">{provider.businessName}</span>
                            {provider.email && <span className="text-xs text-muted-foreground ml-2">(<Mail className="inline h-3 w-3 mr-1"/>{provider.email})</span>}
                        </div>
                        <Badge variant={provider.isVerified ? "default" : "outline"} className={provider.isVerified ? "bg-green-600 hover:bg-green-700" : "border-amber-500 text-amber-600"}>
                            {provider.isVerified ? "Verified" : "Not Verified"}
                            {provider.isVerified && provider.verificationAuthority && ` (${provider.verificationAuthority})`}
                        </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 md:p-6 space-y-6 border-t">
                    
                    {/* Provider Verification Section */}
                    <Card className="bg-muted/20">
                      <CardHeader><CardTitle className="text-md">Provider Account Verification</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={`verify-${provider.id}`} 
                            checked={editingProviderId === provider.id ? currentVerificationStatus : provider.isVerified}
                            onCheckedChange={(checked) => {
                                setEditingProviderId(provider.id);
                                setCurrentVerificationStatus(Boolean(checked));
                                if (!Boolean(checked)) setVerificationAuthority(''); // Clear authority if unchecking
                                else if (provider.verificationAuthority) setVerificationAuthority(provider.verificationAuthority); // Pre-fill if exists
                            }}
                          />
                          <Label htmlFor={`verify-${provider.id}`}>Mark as Verified</Label>
                        </div>
                        {(editingProviderId === provider.id ? currentVerificationStatus : provider.isVerified) && (
                           <div>
                            <Label htmlFor={`authority-${provider.id}`}>Verification Authority</Label>
                            <Input 
                                id={`authority-${provider.id}`} 
                                value={editingProviderId === provider.id ? verificationAuthority : provider.verificationAuthority || ''}
                                onChange={(e) => {
                                    setEditingProviderId(provider.id); // Ensure we are in editing mode
                                    setVerificationAuthority(e.target.value);
                                }}
                                placeholder="e.g., FundiConnect Admin, NCA"
                                className="mt-1"
                            />
                           </div>
                        )}
                      </CardContent>
                      <CardFooter>
                         <Button 
                            size="sm" 
                            onClick={() => handleUpdateProviderVerification(provider.id)}
                            disabled={editingProviderId !== provider.id && !provider.isVerified === !currentVerificationStatus && provider.verificationAuthority === verificationAuthority} // Disable if no changes pending for this provider
                        >
                            <UserCheck className="mr-2 h-4 w-4"/> Update Verification
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* Certifications Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md flex items-center"><KeyRound className="mr-2 h-5 w-5"/>Certifications ({provider.certifications.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {provider.certifications.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No certifications submitted by this provider.</p>
                        ) : (
                          <ul className="space-y-4">
                            {provider.certifications.map(cert => (
                              <li key={cert.id} className="p-3 border rounded-md bg-muted/20">
                                <h4 className="font-medium">{cert.name}</h4>
                                <p className="text-xs text-muted-foreground">Number: {cert.number || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">Issuing Body: {cert.issuingBody}</p>
                                {cert.issueDate && <p className="text-xs text-muted-foreground">Issued: {format(new Date(cert.issueDate), 'PPP')}</p>}
                                {cert.expiryDate && <p className="text-xs text-muted-foreground">Expires: {format(new Date(cert.expiryDate), 'PPP')}</p>}
                                {cert.documentUrl && (
                                    <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center mt-1">
                                        <ExternalLink className="h-3 w-3 mr-1" /> View Document
                                    </a>
                                )}
                                <div className="mt-3 space-y-2">
                                  <Label>Current Status: <Badge variant={cert.status === 'verified' ? 'default' : 'secondary'} className="ml-1 capitalize">{cert.status.replace('_', ' ')}</Badge></Label>
                                  
                                  {editingCertId === cert.id && editingCertProviderId === provider.id ? (
                                    <>
                                      <Select 
                                        value={currentCertStatus} 
                                        onValueChange={(value) => setCurrentCertStatus(value as Certification['status'])}
                                      >
                                        <SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger>
                                        <SelectContent>
                                          {certificationStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      <Textarea 
                                        placeholder="Verification notes (e.g., reason for requires_attention, expiry date mismatch)" 
                                        value={certVerificationNotes}
                                        onChange={(e) => setCertVerificationNotes(e.target.value)}
                                        className="min-h-[80px]"
                                      />
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={handleUpdateCertification}><CheckCircle className="mr-2 h-4 w-4"/>Save Status</Button>
                                        <Button size="sm" variant="outline" onClick={() => { setEditingCertId(null); setEditingCertProviderId(null); }}>Cancel</Button>
                                      </div>
                                    </>
                                  ) : (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => {
                                            setEditingCertProviderId(provider.id);
                                            setEditingCertId(cert.id);
                                            setCurrentCertStatus(cert.status);
                                            setCertVerificationNotes(cert.verificationNotes || '');
                                        }}
                                    >
                                      <Edit3 className="mr-2 h-4 w-4"/> Update Status
                                    </Button>
                                  )}
                                  {cert.verificationNotes && editingCertId !== cert.id && <p className="text-xs text-muted-foreground italic mt-1">Admin Notes: {cert.verificationNotes}</p>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>

                    {/* Other Provider Details - Readonly for admin */}
                    <Card className="bg-muted/20">
                        <CardHeader><CardTitle className="text-md">Provider Details (Read-Only)</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                           <p><strong>Main Service:</strong> {provider.mainService}</p>
                           <p><strong>Location:</strong> {provider.location}</p>
                           <p><strong>Bio:</strong> {provider.bio?.substring(0, 100) || 'N/A'}...</p>
                           <p><strong>Experience:</strong> {provider.yearsOfExperience} years</p>
                           <p><strong>Contact:</strong> {provider.contactPhoneNumber}</p>
                           <Link href={`/providers/${provider.id}`} target="_blank" className="text-primary hover:underline inline-flex items-center mt-2">
                            <ExternalLink className="h-4 w-4 mr-1"/> View Full Public Profile
                           </Link>
                        </CardContent>
                    </Card>

                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
