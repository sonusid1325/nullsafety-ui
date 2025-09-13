"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  Search,
  Calendar,
  Wallet,
} from "lucide-react";
import { supabase, Student, Institution } from "@/lib/supabase";
import toast from "react-hot-toast";

interface StudentFormData {
  name: string;
  roll_no: string;
  admission_date: string;
  wallet_address: string;
  email: string;
  phone: string;
  course: string;
}

interface StudentManagementProps {
  institution: Institution;
}

export function StudentManagement({ institution }: StudentManagementProps) {
  const { publicKey } = useWallet();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    roll_no: "",
    admission_date: "",
    wallet_address: "",
    email: "",
    phone: "",
    course: "",
  });

  const fetchStudents = useCallback(async () => {
    if (!institution?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("institution_id", institution.id)
        .order("roll_no", { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, [institution?.id]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const generateNextRollNo = useCallback(() => {
    if (students.length === 0) return "001";

    const rollNumbers = students.map((s) => {
      const match = s.roll_no.match(/(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });

    const maxRollNo = Math.max(...rollNumbers);
    return String(maxRollNo + 1).padStart(3, "0");
  }, [students]);

  const handleCreateStudent = async () => {
    if (!institution?.id || !publicKey) return;

    try {
      setCreating(true);

      // Check if roll_no already exists
      const { data: existingStudent } = await supabase
        .from("students")
        .select("roll_no")
        .eq("institution_id", institution.id)
        .eq("roll_no", formData.roll_no)
        .single();

      if (existingStudent) {
        toast.error("Roll number already exists");
        return;
      }

      const { error } = await supabase.from("students").insert({
        name: formData.name,
        roll_no: formData.roll_no,
        admission_date: formData.admission_date,
        wallet_address: formData.wallet_address,
        institution_id: institution.id,
        email: formData.email || null,
        phone: formData.phone || null,
        course: formData.course || null,
        status: "Active",
      });

      if (error) throw error;

      toast.success("Student created successfully");
      setIsCreateModalOpen(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error("Error creating student:", error);
      toast.error("Failed to create student");
    } finally {
      setCreating(false);
    }
  };

  const handleEditStudent = async () => {
    if (!editingStudent || !institution?.id) return;

    try {
      setCreating(true);

      const { error } = await supabase
        .from("students")
        .update({
          name: formData.name,
          admission_date: formData.admission_date,
          wallet_address: formData.wallet_address,
          email: formData.email || null,
          phone: formData.phone || null,
          course: formData.course || null,
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      toast.success("Student updated successfully");
      setIsEditModalOpen(false);
      setEditingStudent(null);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (error) throw error;

      toast.success("Student deleted successfully");
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      roll_no: "",
      admission_date: "",
      wallet_address: "",
      email: "",
      phone: "",
      course: "",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setFormData((prev) => ({
      ...prev,
      roll_no: generateNextRollNo(),
      admission_date: new Date().toISOString().split("T")[0],
    }));
    setIsCreateModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      roll_no: student.roll_no,
      admission_date: student.admission_date.split("T")[0],
      wallet_address: student.wallet_address,
      email: student.email || "",
      phone: student.phone || "",
      course: student.course || "",
    });
    setIsEditModalOpen(true);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-black">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <CardTitle>Student Management</CardTitle>
            </div>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, roll no, or wallet address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-black dark:text-white">
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-black dark:text-white">
              {students.length === 0
                ? "No students found. Add your first student!"
                : "No students match your search."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono">
                      {student.roll_no}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>{student.course || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(
                            student.admission_date,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Wallet className="h-3 w-3" />
                        <span className="font-mono text-xs">
                          {student.wallet_address.slice(0, 8)}...
                          {student.wallet_address.slice(-8)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          student.status === "Active" ? "default" : "secondary"
                        }
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(student)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Student Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-black border border-gray-200 dark:border-gray-600">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Enter the student details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roll_no" className="text-right">
                Roll No
              </Label>
              <Input
                id="roll_no"
                value={formData.roll_no}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, roll_no: e.target.value }))
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="admission_date" className="text-right">
                Admission Date
              </Label>
              <Input
                id="admission_date"
                type="date"
                value={formData.admission_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    admission_date: e.target.value,
                  }))
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wallet_address" className="text-right">
                Wallet Address
              </Label>
              <Input
                id="wallet_address"
                value={formData.wallet_address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    wallet_address: e.target.value,
                  }))
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="course" className="text-right">
                Course
              </Label>
              <Input
                id="course"
                value={formData.course}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, course: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreateStudent}
              disabled={
                creating ||
                !formData.name ||
                !formData.roll_no ||
                !formData.admission_date ||
                !formData.wallet_address
              }
            >
              {creating ? "Creating..." : "Create Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-black border border-gray-200 dark:border-gray-600">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_name" className="text-right">
                Name
              </Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_roll_no" className="text-right">
                Roll No
              </Label>
              <Input
                id="edit_roll_no"
                value={formData.roll_no}
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_admission_date" className="text-right">
                Admission Date
              </Label>
              <Input
                id="edit_admission_date"
                type="date"
                value={formData.admission_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    admission_date: e.target.value,
                  }))
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_wallet_address" className="text-right">
                Wallet Address
              </Label>
              <Input
                id="edit_wallet_address"
                value={formData.wallet_address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    wallet_address: e.target.value,
                  }))
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_course" className="text-right">
                Course
              </Label>
              <Input
                id="edit_course"
                value={formData.course}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, course: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_email" className="text-right">
                Email
              </Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_phone" className="text-right">
                Phone
              </Label>
              <Input
                id="edit_phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleEditStudent}
              disabled={
                creating ||
                !formData.name ||
                !formData.admission_date ||
                !formData.wallet_address
              }
            >
              {creating ? "Updating..." : "Update Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
